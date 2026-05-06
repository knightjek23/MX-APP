/**
 * E2E tests for /api/audit and /api/health.
 *
 * Since auth landed (Week 1.5), `/api/audit` is gated by Clerk middleware.
 * Unauthenticated requests are blocked at the middleware layer and never
 * reach the route handler. Most error-path tests have moved to
 * __tests__/api/audit-auth.test.ts (unit) and the happy-path E2E is
 * skipped until we add Playwright + Clerk session helpers.
 */

import { test, expect } from "@playwright/test";

test.describe("/api/audit — middleware boundary", () => {
  test("unauthenticated POST is blocked by middleware (no route reached)", async ({
    request,
  }) => {
    const res = await request.post("/api/audit", {
      data: {
        figma_url: "https://www.figma.com/file/ABC123/Test",
        figma_pat: "figd_anything",
      },
    });
    // Clerk's middleware returns 404 by default for protected API routes
    // to avoid leaking that the endpoint exists. Some Clerk versions return
    // 401 instead. Either is acceptable — the key invariant is "not 2xx".
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("/api/health", () => {
  test("returns sha and status for each dependency", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body).toHaveProperty("sha");
    expect(body).toHaveProperty("figma");
    expect(body).toHaveProperty("claude");
    expect(body).toHaveProperty("supabase");
    expect(["ok", "err"]).toContain(body.figma);
    expect(["ok", "err"]).toContain(body.claude);
    expect(["ok", "err"]).toContain(body.supabase);
  });

  test("returns 200 when all dependencies ok, 503 otherwise", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    const allOk =
      body.figma === "ok" && body.claude === "ok" && body.supabase === "ok";
    expect(res.status()).toBe(allOk ? 200 : 503);
  });
});

/**
 * Full happy path — requires an authenticated Playwright session against
 * Clerk. We skip until we wire that up. Manual verification covers this
 * for now: sign in via the UI, run an audit, confirm slug + dashboard.
 *
 * To enable later, install @clerk/testing and use clerkSetup() per the
 * Clerk Playwright integration docs.
 */
test.describe.skip("/api/audit — full happy path (requires Clerk test session)", () => {
  test("a valid Figma URL + PAT returns a slug", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: {
        figma_url: process.env.E2E_FIGMA_URL ?? "",
        figma_pat: process.env.E2E_FIGMA_PAT ?? "",
      },
      timeout: 60_000,
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
  });
});
