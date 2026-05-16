# Accounts MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to walk this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk-based authentication and a per-user audit dashboard. Audit creation requires sign-in; audit viewing stays public-by-slug. Existing audits remain accessible.

**Architecture:** Clerk handles auth UI + sessions. A new `user_id text` column on `audits` attributes new rows to the creator. Middleware enforces protected routes. Per-user rate limiting via Upstash. Spec: `docs/superpowers/specs/2026-04-27-accounts-mvp-design.md`.

**Tech Stack:** `@clerk/nextjs`, Supabase Postgres, Upstash Redis, Next.js 15 App Router, Vitest, Playwright.

---

## Pre-flight (Josh, in parallel)

These run alongside Task 1 and gate Task 3:

- [ ] **C0** — Sign up at clerk.com, create a "Legible" application.
- [ ] **C1** — In Clerk dashboard, enable Email + Password and Google OAuth as sign-in methods.
- [ ] **C2** — Copy the **Publishable Key** and **Secret Key** from API Keys settings.
- [ ] **C3** — Add to local `.env.local` (Claude will tell you which keys to add when Task 1 is in flight):
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- [ ] **C4** — Add the same two env vars to Vercel (Settings → Environment Variables → Production + Preview + Development).

---

## File map

**New files:**

- `middleware.ts` (repo root) — Clerk middleware classifying public vs protected routes
- `app/sign-in/[[...sign-in]]/page.tsx` — Clerk's `<SignIn />` wrapped
- `app/sign-up/[[...sign-up]]/page.tsx` — Clerk's `<SignUp />` wrapped
- `app/audits/page.tsx` — user's audit list (server component)
- `components/header-nav.tsx` — persistent header with auth state
- `supabase/migrations/002_add_user_id_to_audits.sql` — DB migration
- `__tests__/services/audit-list-by-user.test.ts` — covers the new service method
- `__tests__/api/audit-auth.test.ts` — covers the 401 case + user_id attribution

**Modified files:**

- `app/layout.tsx` — wrap `<ClerkProvider>` + add `<HeaderNav />`
- `app/page.tsx` — landing copy update + form gating
- `app/audit/[slug]/page.tsx` — pass viewer's userId to AuditReport for "Yours" indicator
- `app/api/audit/route.ts` — require auth, write user_id, switch rate limit key
- `components/audit-form.tsx` — branch on signed-in vs signed-out
- `components/audit-report.tsx` — accept optional `viewerUserId`, show "Yours" indicator
- `lib/services/audit.ts` — add user_id to AuditRecord, add `listByUser` method
- `lib/rate-limit/index.ts` — add `auditRateLimitKey(userId)` helper, bump to 20/hr
- `__tests__/services/audit.test.ts` — update fixtures + add user_id assertions
- `e2e/happy-path.spec.ts` — add 401 test; update existing tests to mock auth or skip
- `.env.example` — add Clerk + rate limit env vars
- `.github/workflows/ci.yml` — add Clerk placeholder values to build env
- `PROJECT.md` — note auth landed in Week 1.5 (was Month 1)

---

## Task 1 — Clerk infrastructure + sign-in/sign-up pages

Wire up `@clerk/nextjs`, the provider, the middleware, and the auth pages. After this task, you can sign up locally, but no audit attribution exists yet.

**Files touched:**
- ADD: `middleware.ts`
- ADD: `app/sign-in/[[...sign-in]]/page.tsx`
- ADD: `app/sign-up/[[...sign-up]]/page.tsx`
- MODIFY: `app/layout.tsx`
- MODIFY: `.env.example`
- MODIFY: `.github/workflows/ci.yml`

**Steps:**

- [ ] **1.1** Install `@clerk/nextjs` (`pnpm add @clerk/nextjs`)
- [ ] **1.2** Add Clerk env vars to `.env.example` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- [ ] **1.3** Add Clerk placeholder env vars to `.github/workflows/ci.yml` (`pk_test_ci_placeholder`, `sk_test_ci_placeholder`) so build succeeds in CI without real keys
- [ ] **1.4** Wrap `app/layout.tsx` body in `<ClerkProvider>`
- [ ] **1.5** Create `middleware.ts` at repo root using `clerkMiddleware` and `createRouteMatcher`. Public matcher includes: `/`, `/audit/(.*)`, `/api/health`, `/sign-in/(.*)`, `/sign-up/(.*)`, `/pricing`. Everything else (notably `/api/audit`, `/audits`) is protected.
- [ ] **1.6** Create `app/sign-in/[[...sign-in]]/page.tsx` with `<SignIn />` centered on a clean Legible-branded page
- [ ] **1.7** Create `app/sign-up/[[...sign-up]]/page.tsx` with `<SignUp />` analogously
- [ ] **1.8** Manual verify: `pnpm dev`, visit `/sign-in` and `/sign-up`, confirm Clerk's component renders. Visit `/audits` while signed out — should redirect to `/sign-in?redirect_url=...`
- [ ] **1.9** Run `pnpm typecheck` and `pnpm test` — confirm no regressions
- [ ] **1.10** Commit: `feat(auth): clerk provider + middleware + sign-in/up pages`

**TDD note:** No unit tests in this task — all infrastructure. Manual verification of sign-in flow is the proof.

---

## Task 2 — DB migration + AuditService user_id support

Add `user_id` to the audits table, propagate through the service layer with tests.

**Files touched:**
- ADD: `supabase/migrations/002_add_user_id_to_audits.sql`
- MODIFY: `lib/services/audit.ts`
- MODIFY: `__tests__/services/audit.test.ts`

**Steps:**

- [ ] **2.1** Write the migration SQL: `alter table audits add column user_id text;` + `create index audits_user_id_idx on audits(user_id) where user_id is not null;`
- [ ] **2.2** Apply migration to dev Supabase (paste in SQL editor, hit Run)
- [ ] **2.3** Write failing test in `audit.test.ts`: `persist({...record, user_id: "user_abc"})` — verify the insert call receives `user_id: "user_abc"`
- [ ] **2.4** Run vitest, confirm test fails because AuditRecord type doesn't include user_id
- [ ] **2.5** Add `user_id: string | null` to `AuditRecord` interface in `lib/services/audit.ts`
- [ ] **2.6** Run vitest, confirm the type-error test passes; persist signature now allows user_id
- [ ] **2.7** Update existing test fixtures in `audit.test.ts` to include `user_id: null` (anonymous-style)
- [ ] **2.8** Run full vitest suite, confirm all green
- [ ] **2.9** Commit: `feat(db): add user_id to audits + service support`

**TDD note:** Strict red-green here. Test that requires user_id field fails before AuditRecord interface change, passes after.

---

## Task 3 — `listByUser` service method (depends on T2)

Add the dashboard's data source.

**Files touched:**
- MODIFY: `lib/services/audit.ts`
- ADD: `__tests__/services/audit-list-by-user.test.ts`

**Steps:**

- [ ] **3.1** Write failing test: `listByUser("user_abc")` returns audits ordered by `created_at desc`, only those matching the user_id
- [ ] **3.2** Run vitest, confirm fail (method doesn't exist)
- [ ] **3.3** Implement `listByUser(userId, opts?: { limit?: number })` on `AuditService`. Default limit 50. Uses `.from("audits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit)`.
- [ ] **3.4** Run test, confirm pass
- [ ] **3.5** Add second test: empty result when user has no audits — should return `[]`, not throw
- [ ] **3.6** Run full vitest, confirm all green
- [ ] **3.7** Commit: `feat(service): listByUser method on AuditService`

---

## Task 4 — API route auth + per-user rate limiting (depends on T1, T2, T3)

The `/api/audit` route now requires auth and writes user_id. Rate limiting switches to per-user.

**Files touched:**
- MODIFY: `lib/rate-limit/index.ts`
- MODIFY: `app/api/audit/route.ts`
- ADD: `__tests__/api/audit-auth.test.ts`
- MODIFY: `e2e/happy-path.spec.ts`
- MODIFY: `.env.example` (add `AUDIT_RATE_LIMIT_PER_HOUR`)

**Steps:**

- [ ] **4.1** Write failing API test: POST `/api/audit` with no auth → 401, body `{error: {code: "auth_required"}}`. Mock `auth()` from `@clerk/nextjs/server` to return `{userId: null}`.
- [ ] **4.2** Run test, confirm fail (current route doesn't check auth)
- [ ] **4.3** In `app/api/audit/route.ts`, import `auth` from `@clerk/nextjs/server`, call it first, return 401 if `userId` is null
- [ ] **4.4** Run test, confirm pass
- [ ] **4.5** Write second API test: POST with valid auth → 200, audit row has `user_id: "user_abc"`. Mock auth + Anthropic + Supabase.
- [ ] **4.6** Run test, confirm fail (route doesn't pass user_id to persist yet)
- [ ] **4.7** Pass `userId` through to `auditService.persist({...record, user_id: userId})` in the route
- [ ] **4.8** Run test, confirm pass
- [ ] **4.9** Update `lib/rate-limit/index.ts`: add `auditRateLimitKey(userId)` helper returning `"user:" + userId`. Bump sliding window to `process.env.AUDIT_RATE_LIMIT_PER_HOUR ?? 20` per 1 hour. Add env var to `.env.example`.
- [ ] **4.10** In the route, replace IP-hash key with `auditRateLimitKey(userId)`. Remove `getClientIp` + `hashIp` calls from route (helpers stay in module for future use).
- [ ] **4.11** Update `e2e/happy-path.spec.ts`: existing "rejects invalid PAT" test now expects 401 OR the auth middleware will block before reaching the route. Add explicit "POST /api/audit while signed out → 401" test. The full-happy-path E2E (which needs real audit) becomes harder without real Clerk session — mark it `test.skip` for now with a TODO to add Playwright + Clerk session helpers.
- [ ] **4.12** Run `pnpm test` — full suite green
- [ ] **4.13** Run `pnpm test:e2e` locally with `pnpm dev` running — confirm 401 path works against real Clerk middleware
- [ ] **4.14** Commit: `feat(api): /api/audit requires auth + per-user rate limit`

---

## Task 5 — Header nav (depends on T1)

Persistent header on every page with auth-aware actions.

**Files touched:**
- ADD: `components/header-nav.tsx`
- MODIFY: `app/layout.tsx`

**Steps:**

- [ ] **5.1** Create `components/header-nav.tsx`. Server component using Clerk's `<SignedIn>` / `<SignedOut>` async components. Layout: brand wordmark on left (links to `/`), right side branches on auth state. Signed-in: "My audits" link + `<UserButton />`. Signed-out: "Sign in" link + "Sign up" subtle button.
- [ ] **5.2** Add `<HeaderNav />` to `app/layout.tsx` above `{children}`
- [ ] **5.3** Manual verify: nav renders correctly in both signed-in and signed-out states. Sign-out from UserButton sends user back to `/`.
- [ ] **5.4** Run `pnpm typecheck` + `pnpm test` — confirm no regressions
- [ ] **5.5** Commit: `feat(ui): persistent header nav with auth state`

**TDD note:** No unit tests; this is presentation + Clerk components. Manual verify both states.

---

## Task 6 — Auth-aware landing form (depends on T1)

Anonymous visitors see a sign-up CTA instead of the audit form. Landing copy updated.

**Files touched:**
- MODIFY: `app/page.tsx`
- MODIFY: `components/audit-form.tsx`

**Steps:**

- [ ] **6.1** Update landing copy in `app/page.tsx`: replace "First 3 audits free. Credit packs start at $5..." with "Free during beta — sign up to get started." Pricing link still goes to `/pricing`.
- [ ] **6.2** In `components/audit-form.tsx`, use Clerk's `useUser()` (or convert to a server boundary with `auth()` if cleaner). Branch: if not signed-in, render a centered card with "Sign up to run your first audit" message + Sign Up button (linking to `/sign-up`) + small "Already have an account? Sign in" link. If signed-in, render the existing form unchanged.
- [ ] **6.3** Manual verify: signed-out → CTA card appears; sign-up button goes to `/sign-up`. Signed-in → form renders normally.
- [ ] **6.4** Run `pnpm test` — existing tests must still pass (form behavior shouldn't have changed for signed-in case)
- [ ] **6.5** Commit: `feat(ui): auth-gated audit form + landing copy update`

---

## Task 7 — Audits dashboard (depends on T3, T5)

The `/audits` page listing the current user's audits.

**Files touched:**
- ADD: `app/audits/page.tsx`

**Steps:**

- [ ] **7.1** Create `app/audits/page.tsx`. Server component. Calls `auth()` to get userId (middleware ensures we're signed in). Calls `new AuditService(getSupabaseClient()).listByUser(userId)`. Renders:
  - Header: "My audits" h1 + "New audit" button (link to `/`)
  - If empty: centered "No audits yet" text + "Run your first audit →" link
  - If populated: list of cards, each showing frame name (h3, link to `/audit/[slug]`), score badge, scope label, relative date ("2 days ago"), file ID in mono dim
- [ ] **7.2** Use the existing design system tokens (neutral surfaces, semantic score colors). Reuse `<ScoreBadge>` if it makes sense in compact form, or build a small inline score chip.
- [ ] **7.3** Manual verify (after Task 4 ships): sign in, run an audit, navigate to `/audits` — the audit appears. Empty state visible for fresh accounts.
- [ ] **7.4** Run `pnpm typecheck` + `pnpm test`
- [ ] **7.5** Commit: `feat(ui): /audits dashboard listing user's past audits`

**TDD note:** Server component fetching real DB data — covered by manual + the underlying `listByUser` test from T3.

---

## Task 8 — Owner indicator on audit report (depends on T2, T5)

Small UX touch: when the audit owner views their own report, show a "Yours" indicator and a "Re-run audit" CTA.

**Files touched:**
- MODIFY: `app/audit/[slug]/page.tsx`
- MODIFY: `components/audit-report.tsx`

**Steps:**

- [ ] **8.1** In `app/audit/[slug]/page.tsx`, get `userId` via `auth()` (returns null if not signed in). Pass `viewerUserId={userId}` prop to `<AuditReport />`.
- [ ] **8.2** In `components/audit-report.tsx`, add optional `viewerUserId?: string | null` prop. Compute `isOwner = !!viewerUserId && viewerUserId === audit.user_id`.
- [ ] **8.3** When `isOwner`, render a small "Yours" pill in the metadata row (next to the scope label) with subtle styling. Optional: add a "Re-run audit" link in the footer that goes to `/?figma_url=<encoded>` (similar to entity-conflicts upsell pattern).
- [ ] **8.4** Manual verify: owner sees "Yours" + the link; non-owner viewing same audit sees normal report; signed-out viewer sees normal report
- [ ] **8.5** Run `pnpm typecheck` + `pnpm test`
- [ ] **8.6** Commit: `feat(ui): owner indicator + re-run cta on audit report`

---

## Task 9 — PROJECT.md update + spec/plan commit

Document that auth landed in Week 1.5 instead of Month 1.

**Files touched:**
- MODIFY: `PROJECT.md`
- The spec + plan files are already committed alongside their tasks

**Steps:**

- [ ] **9.1** In `PROJECT.md` §5.2 / §5.3, update to reflect Clerk auth landed Week 1.5 with hard-gate sign-in. Note the rate limit changed from 5/hr IP to 20/hr per user. Note the dashboard at `/audits`. Note the existing audits remain accessible.
- [ ] **9.2** In §11 (Risks / Resolved in v2), add an entry: "Auth landed Week 1.5 (was planned Month 1) — accelerated due to traction signal." Add a new open question if relevant: how do we handle the existing audit (`I0Bm1ZMh6w`) when the original creator signs up? (Answer: it stays unowned. They'd need to re-run for attribution.)
- [ ] **9.3** Commit: `docs: project.md + design/plan for accounts mvp`

---

## Verification gates

Before merging the feature branch back to main:

- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm test` — all green (expecting ~80 tests after additions; will confirm exact count)
- [ ] `pnpm test:e2e` — error path tests pass against real Clerk middleware
- [ ] Manual flow: sign up → confirm email → land on `/` → submit audit → see in `/audits` → click into report → see "Yours" → sign out → form gone
- [ ] Manual flow: incognito visitor → `/audit/<existing slug>` → renders normally with no "Yours"
- [ ] Vercel preview deploy: build succeeds, smoke test on preview URL passes

---

## Open questions for execution time

- **Existing audit attribution.** When Josh signs up under his own account, should the system retroactively attribute his existing audit (`I0Bm1ZMh6w`) to him? Resolution per the spec: no, it stays unowned. He can re-run the file under his account if he wants it in his dashboard. Cleaner than guessing, no security implications.
- **Clerk theme.** The design system uses neutral + semantic accents. Clerk's default Sign-In looks fine but slightly off-brand. We can use the `appearance` prop to tune later — punted to a polish ticket.

---

## Branching

Work on a feature branch, not `main`:

```bash
git checkout -b accounts-mvp
# ... task by task ...
# At the end: PR or fast-forward merge back to main
```
