/**
 * E2E tests for /api/audit and /api/health.
 *
 * Tests the HTTP layer, error paths, and (optionally) the full audit
 * flow against real APIs when E2E_FIGMA_URL and E2E_FIGMA_PAT are set.
 *
 * Failure-path tests run without any credentials — safe in CI.
 * The full happy-path test is skipped unless real credentials are
 * provided via env vars.
 */

import { test, expect } from "@playwright/test";

test.describe("/api/audit — error paths (no credentials needed)", () => {
  test("rejects malformed JSON body with 400", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: "not json at all",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_json");
  });

  test("rejects missing figma_pat with 400", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: { figma_url: "https://www.figma.com/file/ABC/Test" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_body");
  });

  test("rejects missing figma_url with 400", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: { figma_pat: "figd_something" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_body");
  });

  test("rejects an invalid Figma URL with a helpful message", async ({
    request,
  }) => {
    const res = await request.post("/api/audit", {
      data: {
        figma_url: "https://example.com/not-figma",
        figma_pat: "figd_test",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_figma_url");
    expect(body.error.message).toContain("Figma");
  });

  test("rejects an invalid Figma PAT with 401", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: {
        figma_url: "https://www.figma.com/file/ABC123/Test",
        figma_pat: "PLACEHOLDER_INVALID_PAT_FOR_TEST",
      },
    });
    // 401 (bad token) or 404 (file not accessible) both acceptable
    expect([401, 404]).toContain(res.status());
    const body = await res.json();
    expect(["invalid_figma_token", "file_not_found"]).toContain(
      body.error.code
    );
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
 * Full happy path — runs only when real credentials are provided.
 * Set E2E_FIGMA_URL and E2E_FIGMA_PAT in your shell or .env to enable.
 *
 * Costs a real Anthropic token spend (~$0.10) per run. Don't put in CI
 * without gating, or it'll drain your prepaid balance over time.
 */
const E2E_FIGMA_URL = process.env.E2E_FIGMA_URL;
const E2E_FIGMA_PAT = process.env.E2E_FIGMA_PAT;

test.describe("/api/audit — full happy path (requires E2E_FIGMA_* env vars)", () => {
  test.skip(
    !E2E_FIGMA_URL || !E2E_FIGMA_PAT,
    "Set E2E_FIGMA_URL and E2E_FIGMA_PAT to enable this test"
  );

  test("a valid Figma URL + PAT returns a slug", async ({ request }) => {
    const res = await request.post("/api/audit", {
      data: {
        figma_url: E2E_FIGMA_URL,
        figma_pat: E2E_FIGMA_PAT,
      },
      timeout: 60_000,
    });

    expect(res.ok(), `API returned ${res.status()}: ${await res.text()}`).toBe(
      true
    );
    const body = await res.json();
    expect(body.slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(body.audit_url).toBe(`/audit/${body.slug}`);
  });
});
