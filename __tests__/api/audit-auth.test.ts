/**
 * Tests for the auth + user_id-attribution layer of POST /api/audit.
 *
 * Two key behaviors:
 *   1. Returns 401 when no userId from Clerk's auth() — defense-in-depth
 *      even though middleware also gates this route.
 *   2. When authenticated, the userId from auth() flows into the persist
 *      payload as user_id (alongside everything else).
 *
 * The full audit pipeline (Figma fetch, compact, Claude call) is mocked
 * to no-op happy paths since it's tested elsewhere. This file only cares
 * about the auth boundary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- mocks ------------------------------------------------------------------

// Clerk auth — the thing we're testing
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Figma — return a minimal valid tree
vi.mock("@/lib/services/figma", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/figma")
  >("@/lib/services/figma");
  return {
    ...actual,
    FigmaService: class {
      constructor() {}
      async fetchFile() {
        return {
          id: "0:0",
          name: "Test Frame",
          type: "FRAME",
          children: [],
        };
      }
    },
  };
});

// Claude — return a minimal valid audit
vi.mock("@/lib/services/claude", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/claude")
  >("@/lib/services/claude");
  return {
    ...actual,
    ClaudeService: class {
      constructor() {}
      async audit() {
        return {
          audit_version: "v1" as const,
          scope: "single-frame" as const,
          frames: [],
          entity_conflicts: [],
          summary: {
            p1_count: 0,
            p2_count: 0,
            p3_count: 0,
            overall_score: 100,
          },
          tokens_input: 100,
          tokens_output: 50,
          latency_ms: 1000,
          cost_usd: 0.01,
          model: "claude-sonnet-4-5",
        };
      }
    },
  };
});

// AuditService — capture what gets persisted so we can assert user_id.
// The `_record` param type tells TS the mock receives a single record arg
// so mock.calls[0][0] resolves to that record (otherwise TS infers empty
// tuple and indexing errors).
const persistSpy = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_record: { user_id: string | null; [k: string]: unknown }) => ({
    id: "uuid-test",
    slug: "slug-test",
  })
);
vi.mock("@/lib/services/audit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/audit")
  >("@/lib/services/audit");
  return {
    ...actual,
    AuditService: class {
      constructor() {}
      persist = persistSpy;
    },
  };
});

// Supabase client — just needs to not throw
vi.mock("@/lib/db/supabase", () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

// Rate limiter — always pass. Typed `_key: string` so TS infers the args
// tuple correctly for `limitSpy.mock.calls[0][0]` access in tests.
const limitSpy = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_key: string) => ({
    success: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 3_600_000,
  })
);
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/rate-limit")
  >("@/lib/rate-limit");
  return {
    ...actual,
    getAuditRateLimit: () => ({ limit: limitSpy }),
  };
});

// Import the route handler AFTER mocks are set up
import { POST } from "@/app/api/audit/route";

// --- helpers ----------------------------------------------------------------

function makeRequest(body: object) {
  return new NextRequest("http://localhost:3000/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  figma_url: "https://www.figma.com/file/ABC123/Test",
  figma_pat: "figd_test_token_for_audit",
};

// --- tests ------------------------------------------------------------------

describe("POST /api/audit — auth boundary", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    persistSpy.mockClear();
    limitSpy.mockClear().mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 3_600_000,
    });
  });

  it("returns 401 with auth_required code when no userId", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("auth_required");
  });

  it("does NOT call persist when not signed in", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await POST(makeRequest(validBody));
    expect(persistSpy).not.toHaveBeenCalled();
  });

  it("forwards Clerk userId to AuditService.persist as user_id", async () => {
    mockAuth.mockResolvedValue({ userId: "user_clerk_xyz" });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(persistSpy).toHaveBeenCalledTimes(1);
    const persistArg = persistSpy.mock.calls[0][0] as { user_id: string };
    expect(persistArg.user_id).toBe("user_clerk_xyz");
  });

  it("rate-limits by user_id (not by IP)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_clerk_abc" });
    await POST(makeRequest(validBody));
    expect(limitSpy).toHaveBeenCalledTimes(1);
    const key = limitSpy.mock.calls[0][0] as string;
    expect(key).toContain("user_clerk_abc");
    expect(key).not.toMatch(/^[a-f0-9]{64}$/); // not a SHA-256 IP hash
  });
});
