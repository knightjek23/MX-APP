# Prompt 4 — API route + rate limiting + health check + E2E

This is the prompt where the app actually works end-to-end. After this you can POST to `/api/audit` with a Figma URL and get a real `/audit/<slug>` URL back.

## What's in here

**Production code:**
- `lib/rate-limit/index.ts` — Upstash rate limiter (5/hr) + IP hashing + header extraction
- `lib/db/supabase.ts` — server-only Supabase client factory
- `app/api/audit/route.ts` — the main POST handler, orchestrates the full pipeline
- `app/api/health/route.ts` — GET handler, checks all three upstream services

**Tests:**
- `__tests__/rate-limit.test.ts` — 10 tests for hashIp + getClientIp
- `e2e/happy-path.spec.ts` — Playwright E2E covering error paths (always run) + full happy path (opt-in)

**Config:**
- `playwright.config.ts` — auto-starts `pnpm dev`, runs tests, tears down

## Step 1 — copy files into `legible/`

Drag these from `prompt-4-bundle/` into your repo root, preserving paths:

- `lib/rate-limit/index.ts` → overwrites placeholder
- `lib/db/supabase.ts` → overwrites placeholder
- `app/api/audit/route.ts` → new file (you deleted the placeholder earlier)
- `app/api/health/route.ts` → new file (ditto)
- `__tests__/rate-limit.test.ts` → new
- `e2e/happy-path.spec.ts` → overwrites placeholder
- `playwright.config.ts` → root of repo (new)

When Windows asks about merging, say **Replace the files in the destination**.

## Step 2 — verify env vars

Your `.env.local` must now have all six of these filled in (not blank):

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
UPSTASH_REDIS_URL=https://<region>-<name>.upstash.io
UPSTASH_REDIS_TOKEN=AX...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The Upstash values must be the **REST API** credentials — look for "REST URL" and "REST Token" in your Upstash database dashboard, NOT the Redis endpoint or password.

## Step 3 — run unit tests

```bash
pnpm test
```

You should now see 77 tests pass (67 from Prompt 3 + 10 from rate-limit):

```
 ✓ __tests__/rate-limit.test.ts (10 tests)
 ✓ __tests__/logger.test.ts (7 tests)
 ✓ __tests__/compact.test.ts (14 tests)
 ✓ __tests__/scoring.test.ts (11 tests)
 ✓ __tests__/validation/figma-url.test.ts (12 tests)
 ✓ __tests__/services/figma.test.ts (9 tests)
 ✓ __tests__/services/claude.test.ts (8 tests)
 ✓ __tests__/services/audit.test.ts (6 tests)

 Test Files  8 passed (8)
      Tests  77 passed (77)
```

## Step 4 — install Playwright browsers (one-time)

Playwright needs to download Chromium the first time:

```bash
pnpm exec playwright install chromium
```

This takes ~2 minutes and ~150MB of disk.

## Step 5 — run E2E tests

```bash
pnpm test:e2e
```

Playwright will auto-start your dev server, run the error-path tests, tear down, and report. The happy-path test is skipped unless you set `E2E_FIGMA_URL` and `E2E_FIGMA_PAT` env vars — we'll exercise that manually in the next step instead, so we can watch the full flow.

You should see ~7 tests pass (5 error paths + 2 health checks), 1 skipped.

## Step 6 — smoke test against a real Figma file (the exciting part)

Start the dev server in one terminal:

```bash
pnpm dev
```

In a second terminal (Git Bash), hit the audit endpoint with a real file. You need:
- A Figma URL from a file you have access to (your SoloDesk dashboard is perfect)
- A Figma Personal Access Token (Figma → Settings → Security → Personal access tokens → Create new)

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "figma_url": "https://www.figma.com/design/YOUR_FILE_ID/YourFile?node-id=31-198",
    "figma_pat": "figd_YOUR_PAT_HERE"
  }'
```

If everything's working, after 10-30 seconds you'll get back:

```json
{
  "slug": "aBc1234567",
  "audit_url": "/audit/aBc1234567"
}
```

That's your first real audit. It's saved in Supabase. Confirm by checking the Supabase Table Editor — there should be one row in the `audits` table.

The `/audit/aBc1234567` URL won't render as anything pretty yet (that's Prompt 5), but you can view the raw JSON via the Supabase dashboard.

## Step 7 — smoke test the health endpoint

```bash
curl http://localhost:3000/api/health
```

Should return something like:

```json
{
  "sha": "local",
  "figma": "ok",
  "claude": "ok",
  "supabase": "ok"
}
```

If any service shows `"err"`, check the corresponding env var.

## Step 8 — commit

```bash
git add .
git commit -m "api routes: /audit + /health + rate limiting + E2E"
git push
```

## What's working after this prompt

- POST /api/audit — full audit pipeline, rate limited, all error paths covered
- GET /api/health — dependency status for ops
- Audit results persisted to Supabase with a shareable slug
- Real cost + token tracking on every run
- Playwright E2E running locally (will move to CI in Prompt 6)

## Likely issues

- **"Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN"** — you're using the Redis endpoint/password instead of REST credentials. In the Upstash dashboard, click your database → scroll down to "REST API" → copy those values.
- **Supabase error on first call** — the migration SQL wasn't run. Paste `supabase/migrations/001_initial_audits_table.sql` into the SQL editor and run it.
- **Claude returns 529 / "overloaded"** — Anthropic API is busy. Retry in 30 seconds. The error response includes the retry-after context.
- **Playwright webServer timeout** — if `pnpm dev` is already running from another terminal, Playwright will reuse it (good). If dev server crashes during the test, Playwright will kill the test (also good).

## What's next

Prompt 5 — the UI. Landing page form, report page rendering the audit, annotation cards, filter chips, score badge, dark mode, the lot. That's the "users see a real product" step.

After Prompt 5 you run the real cold send to your 20 designers.
