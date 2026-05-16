import { describe, it, expect, vi } from "vitest";
import {
  AuditService,
  AuditFetchError,
} from "@/lib/services/audit";

/**
 * deleteBySlug is owner-scoped: the query filters by BOTH slug and
 * user_id. If a different user tries to delete (or a public viewer
 * with the slug guesses the URL), no rows match and { deleted: false }
 * comes back. The route handler turns that into a 404.
 */

function makeDeleteMock(count: number, error: { message: string } | null = null) {
  // .from("audits").delete({ count: "exact" }).eq(...).eq(...)
  // ends in `.eq()` returning the supabase result. Each .eq() is chainable
  // but only the last one in the chain triggers the promise.
  const innerEq = vi.fn(async () => ({ count, error }));
  const outerEq = vi.fn(() => ({ eq: innerEq }));
  const del = vi.fn(() => ({ eq: outerEq }));
  const from = vi.fn(() => ({ delete: del }));
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { from } as any,
    spies: { from, del, outerEq, innerEq },
  };
}

describe("AuditService.deleteBySlug", () => {
  it("returns { deleted: true } when one row matches and is deleted", async () => {
    const { db } = makeDeleteMock(1);
    const svc = new AuditService(db);
    const result = await svc.deleteBySlug("slug-abc", "user_clerk_xyz");
    expect(result).toEqual({ deleted: true });
  });

  it("returns { deleted: false } when no rows match (wrong owner or missing slug)", async () => {
    const { db } = makeDeleteMock(0);
    const svc = new AuditService(db);
    const result = await svc.deleteBySlug("slug-not-mine", "user_clerk_xyz");
    expect(result).toEqual({ deleted: false });
  });

  it("filters by both slug and user_id (defense against URL guessing)", async () => {
    const { db, spies } = makeDeleteMock(1);
    const svc = new AuditService(db);
    await svc.deleteBySlug("slug-abc", "user_clerk_xyz");
    expect(spies.outerEq).toHaveBeenCalledWith("slug", "slug-abc");
    expect(spies.innerEq).toHaveBeenCalledWith("user_id", "user_clerk_xyz");
  });

  it("requests exact count from Supabase so we can tell match-vs-no-match", async () => {
    const { db, spies } = makeDeleteMock(1);
    const svc = new AuditService(db);
    await svc.deleteBySlug("slug-abc", "user_clerk_xyz");
    expect(spies.del).toHaveBeenCalledWith({ count: "exact" });
  });

  it("throws AuditFetchError when the database returns an error", async () => {
    const { db } = makeDeleteMock(0, { message: "connection lost" });
    const svc = new AuditService(db);
    await expect(
      svc.deleteBySlug("slug-abc", "user_clerk_xyz")
    ).rejects.toThrow(AuditFetchError);
  });
});
