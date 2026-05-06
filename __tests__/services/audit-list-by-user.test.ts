import { describe, it, expect, vi } from "vitest";
import {
  AuditService,
  AuditFetchError,
  type StoredAudit,
} from "@/lib/services/audit";
import type { AuditResult } from "@/lib/types/audit";

const sampleAuditJson: AuditResult = {
  audit_version: "v1",
  scope: "single-frame",
  frames: [],
  entity_conflicts: [],
  summary: { p1_count: 0, p2_count: 0, p3_count: 0, overall_score: 100 },
};

function makeStoredAudit(slug: string, createdAt: string): StoredAudit {
  return {
    id: `id-${slug}`,
    slug,
    figma_file_id: "ABC",
    figma_node_id: null,
    figma_url: "https://www.figma.com/file/ABC/Stuff",
    scope: "single-frame",
    frame_count: 1,
    model: "claude-sonnet-4-5",
    latency_ms: 1000,
    tokens_input: 1000,
    tokens_output: 200,
    tokens_compacted: 500,
    cost_usd: 0.01,
    audit_json: sampleAuditJson,
    error: null,
    user_ip_hash: null,
    user_id: "user_test_abc",
    run_at_utc: createdAt,
    created_at: createdAt,
  };
}

/**
 * Build a mock Supabase client that exposes a fluent
 * .from().select().eq().order().limit() chain ending in the given data.
 * Each call in the chain is a vi.fn so tests can assert what was called.
 */
function makeListMock(returnData: StoredAudit[] | null, error: { message: string } | null = null) {
  const limit = vi.fn(async () => ({ data: returnData, error }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { from } as any,
    spies: { from, select, eq, order, limit },
  };
}

describe("AuditService.listByUser", () => {
  it("returns audits matching the user_id", async () => {
    const audits = [
      makeStoredAudit("recent-slug", "2026-04-25T10:00:00Z"),
      makeStoredAudit("older-slug", "2026-04-20T10:00:00Z"),
    ];
    const { db } = makeListMock(audits);
    const svc = new AuditService(db);
    const result = await svc.listByUser("user_test_abc");
    expect(result).toEqual(audits);
  });

  it("returns empty array (not null, not throws) when user has no audits", async () => {
    const { db } = makeListMock([]);
    const svc = new AuditService(db);
    const result = await svc.listByUser("user_no_audits");
    expect(result).toEqual([]);
  });

  it("filters by user_id (calls .eq with the right column and value)", async () => {
    const { db, spies } = makeListMock([]);
    const svc = new AuditService(db);
    await svc.listByUser("user_target");
    expect(spies.eq).toHaveBeenCalledWith("user_id", "user_target");
  });

  it("orders by created_at descending", async () => {
    const { db, spies } = makeListMock([]);
    const svc = new AuditService(db);
    await svc.listByUser("user_x");
    expect(spies.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("uses default limit of 50 when not specified", async () => {
    const { db, spies } = makeListMock([]);
    const svc = new AuditService(db);
    await svc.listByUser("user_x");
    expect(spies.limit).toHaveBeenCalledWith(50);
  });

  it("respects custom limit option", async () => {
    const { db, spies } = makeListMock([]);
    const svc = new AuditService(db);
    await svc.listByUser("user_x", { limit: 10 });
    expect(spies.limit).toHaveBeenCalledWith(10);
  });

  it("throws AuditFetchError on database error", async () => {
    const { db } = makeListMock(null, { message: "connection lost" });
    const svc = new AuditService(db);
    await expect(svc.listByUser("user_x")).rejects.toThrow(AuditFetchError);
  });

  it("treats null data as empty array (defensive against weird Supabase returns)", async () => {
    const { db } = makeListMock(null, null);
    const svc = new AuditService(db);
    const result = await svc.listByUser("user_x");
    expect(result).toEqual([]);
  });
});
