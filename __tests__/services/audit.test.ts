import { describe, it, expect, vi } from "vitest";
import {
  AuditService,
  AuditPersistError,
  AuditFetchError,
  type AuditRecord,
} from "@/lib/services/audit";
import type { AuditResult } from "@/lib/types/audit";

const sampleAudit: AuditResult = {
  audit_version: "v1",
  scope: "full-file",
  frames: [],
  entity_conflicts: [],
  summary: { p1_count: 0, p2_count: 0, p3_count: 0, overall_score: 100 },
};

const baseRecord: AuditRecord = {
  figma_file_id: "ABC",
  figma_node_id: null,
  figma_url: "https://www.figma.com/file/ABC/Stuff",
  scope: "full-file",
  frame_count: 5,
  model: "claude-sonnet-4-5",
  latency_ms: 1200,
  tokens_input: 5000,
  tokens_output: 800,
  tokens_compacted: 3200,
  cost_usd: 0.027,
  audit_json: sampleAudit,
  error: null,
  user_ip_hash: "sha256-xyz",
};

function mockDb(opts: {
  insertResult?: { data: unknown; error: unknown };
  selectResult?: { data: unknown; error: unknown };
} = {}) {
  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(
            async () =>
              opts.insertResult ?? {
                data: { id: "uuid-123", slug: "slug-abc" },
                error: null,
              }
          ),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(
            async () => opts.selectResult ?? { data: null, error: null }
          ),
        })),
      })),
    })),
  };
}

describe("AuditService", () => {
  it("persists an audit and returns the generated slug + id", async () => {
    const db = mockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new AuditService(db as any);
    const result = await svc.persist(baseRecord);
    expect(result.slug).toBe("slug-abc");
    expect(result.id).toBe("uuid-123");
  });

  it("generates a 10-char nanoid slug (the mock ignores our slug, but real DB accepts it)", async () => {
    const capturedInserts: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      from: () => ({
        insert: (row: unknown) => {
          capturedInserts.push(row);
          return {
            select: () => ({
              single: async () => ({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: { id: "uuid", slug: (row as any).slug },
                error: null,
              }),
            }),
          };
        },
      }),
    };
    const svc = new AuditService(db);
    const { slug } = await svc.persist(baseRecord);
    expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((capturedInserts[0] as any).slug).toBe(slug);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((capturedInserts[0] as any).run_at_utc).toMatch(
      /^\d{4}-\d{2}-\d{2}T/
    );
  });

  it("throws AuditPersistError on a DB insert error", async () => {
    const db = mockDb({
      insertResult: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new AuditService(db as any);
    await expect(svc.persist(baseRecord)).rejects.toThrow(AuditPersistError);
  });

  it("fetches an audit by slug and returns the full record", async () => {
    const db = mockDb({
      selectResult: {
        data: {
          id: "uuid",
          slug: "abc",
          ...baseRecord,
          run_at_utc: "2026-04-20T10:00:00Z",
          created_at: "2026-04-20T10:00:00Z",
        },
        error: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new AuditService(db as any);
    const result = await svc.fetch("abc");
    expect(result?.slug).toBe("abc");
    expect(result?.scope).toBe("full-file");
  });

  it("returns null when slug is not found", async () => {
    const db = mockDb({ selectResult: { data: null, error: null } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new AuditService(db as any);
    expect(await svc.fetch("missing")).toBeNull();
  });

  it("throws AuditFetchError on a DB select error", async () => {
    const db = mockDb({
      selectResult: { data: null, error: { message: "connection lost" } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new AuditService(db as any);
    await expect(svc.fetch("abc")).rejects.toThrow(AuditFetchError);
  });
});
