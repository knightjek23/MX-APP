# Accounts MVP — Design

**Date:** 2026-04-27
**Author:** Josh + Claude
**Status:** Draft, pending approval

---

## 1. Goal

Move Legible from anonymous-by-default to authenticated-by-default. Signed-in users can save audits and view their history. Existing public-by-slug sharing stays unchanged.

This is the smallest possible "real account system" that ships meaningful value:

- A user can sign up with email/password or Google.
- A user must be signed in to run an audit.
- Their audits attribute to them and appear in a personal list.
- Anyone with an audit URL can still view that audit (sharing model unchanged).
- Existing audits (created pre-auth) remain publicly accessible, unowned.

## 2. Non-goals (deferred)

- **Stripe / credit packs.** Pricing stays "free during beta."
- **Profile / settings page.** Clerk's user button modal handles email/password change for now.
- **Renaming / deleting / re-running audits from the dashboard.** List view only for MVP.
- **Workspaces / teams / sharing controls.** Single-user accounts only.
- **Audit privacy toggles.** Everything stays public-by-slug.
- **Email customization, MFA, magic links.** Clerk defaults.

## 3. Architecture decisions

### 3.1 Auth provider: Clerk

Per PROJECT.md §3. `@clerk/nextjs` integrates cleanly with App Router, ships pre-built sign-in / sign-up components, handles password reset and email verification with no code from us. Free tier covers 10k MAU, well above Week 1 needs.

### 3.2 Sign-in methods

- Email + password
- Google OAuth

Both enabled in the Clerk dashboard. No GitHub or magic links for MVP.

### 3.3 Access model: hard gate to create, public to view

| Action | Auth required? |
|---|---|
| Visit `/` (landing) | No |
| Submit audit form | **Yes** — form redirects to sign-in if anonymous |
| View `/audit/[slug]` | No — public, anyone with the URL |
| View `/audits` (dashboard) | **Yes** |
| `POST /api/audit` | **Yes** — middleware blocks anonymous |
| `GET /api/health` | No |

This means the slug is still the share link. A user can audit a file, share the URL with a teammate, the teammate views without an account. Their experience is read-only — they can't run a new audit without signing up.

### 3.4 Existing audits stay accessible

The audits table currently has no user_id column. After migration, all existing rows will have `user_id = NULL`. The `/audit/[slug]` page will continue to render them publicly. Only owned audits (`user_id IS NOT NULL`) appear in any user's dashboard.

This means Josh's existing `I0Bm1ZMh6w` audit URL keeps working untouched.

### 3.5 Rate limiting

Currently: 5 audits/hr per IP via Upstash, salted hash.

After auth lands: 20 audits/hr per Clerk user_id. Keyed by user_id rather than IP (since every audit creator is now authenticated). The IP-based limit is removed — users can audit from any device.

20/hr is generous for the beta. Tuneable via env var `AUDIT_RATE_LIMIT_PER_HOUR=20` so we can adjust without a deploy.

## 4. Database changes

Single migration `002_add_user_id_to_audits.sql`:

```sql
alter table audits add column user_id text;
create index audits_user_id_idx on audits(user_id) where user_id is not null;
```

- `text` not `uuid` because Clerk user IDs are formatted like `user_2abc...` strings.
- Nullable so existing rows don't break.
- Partial index (where user_id is not null) avoids indexing the anonymous historical rows.

No `users` table — Clerk owns user data. We only need the user_id reference.

## 5. Routes + middleware

### 5.1 New routes

- `GET /sign-in` — Clerk's `<SignIn />` component
- `GET /sign-up` — Clerk's `<SignUp />` component
- `GET /sign-in/sso-callback` (and similar) — Clerk handles automatically via catch-all `[[...sign-in]]`
- `GET /audits` — list of authenticated user's past audits, signed-in only

### 5.2 Modified routes

- `POST /api/audit` — requires auth. Reads user_id from `auth()`. Persists with user_id. Rate limits per user_id.
- `GET /api/health` — unchanged. Public.
- `/audit/[slug]` — unchanged behavior, but display tweak: when the viewer is the audit owner, show a small "Yours" indicator. Otherwise unchanged.

### 5.3 Middleware

`middleware.ts` at repo root:

- Public routes: `/`, `/audit/(.*)`, `/api/health`, `/sign-in/(.*)`, `/sign-up/(.*)`, `/pricing`, static assets.
- Protected routes: `/audits/(.*)`, `/api/audit`.
- Anonymous request to a protected route → redirect to `/sign-in?redirect_url=<original>`.

## 6. UI changes

### 6.1 Header nav (new component)

A persistent header at the top of every page. Components:

- **Brand wordmark** (`Legible`) on the left, links to `/`
- **Right side:**
  - Signed in: "My audits" link + Clerk's `<UserButton />` (avatar dropdown with sign out)
  - Signed out: "Sign in" link + "Sign up" button (subtle CTA emphasis)

Header lives in `app/layout.tsx` so it appears on every page.

### 6.2 Landing page (`app/page.tsx`)

- Hero copy unchanged.
- Pricing line changes: ~~"First 3 audits free"~~ → "Free during beta — sign up to get started."
- Form: signed-in users see the existing form. Signed-out users see a centered CTA: "Sign up to run your first audit" + Sign Up button.
- "What is Machine Experience?" explainer block stays.

### 6.3 Audit form (`components/audit-form.tsx`)

- Add an early-return check: if `!isSignedIn`, render the sign-up CTA instead of the form fields.
- All other behavior unchanged. Submit still POSTs to `/api/audit` (now auth-required).

### 6.4 Dashboard (`app/audits/page.tsx`)

Server component. Fetches the current user's audits via a new `AuditService.listByUser(userId)` method.

Layout:

- Header row: "My audits" h1, optional "New audit" button (links to `/`)
- Empty state: "No audits yet. [Run your first audit →]" linked to `/`
- List: each row shows
  - Frame name (h3 link to `/audit/[slug]`)
  - Score badge (small)
  - Scope ("Full file" / "Single frame")
  - Run date (relative — "2 days ago")
  - File ID (mono, dim)
- Pagination: not for MVP — show up to 50, add "Showing 50 of N" footer if more

Tinted card surfaces for each row, matching the existing design system.

### 6.5 Sign-in / Sign-up pages

`app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`.

Each renders Clerk's `<SignIn />` or `<SignUp />` centered on a clean page with the Legible wordmark above. Clerk's appearance prop tunes colors to match the design system (neutrals + accent).

## 7. Service-layer changes

### 7.1 `lib/services/audit.ts`

`AuditRecord` gains a new field:

```ts
user_id: string | null;
```

New method:

```ts
async listByUser(userId: string, opts?: { limit?: number }): Promise<StoredAudit[]>
```

Returns audits ordered by `created_at desc`, default limit 50.

### 7.2 `lib/rate-limit/index.ts`

Existing `auditRateLimit` switches its key strategy. Helper:

```ts
export function auditRateLimitKey(userId: string): string {
  return `user:${userId}`;
}
```

Old IP-hashing utilities (`hashIp`, `getClientIp`) stay but are no longer called from the audit route. Keep them in case we need them for `/api/health` abuse prevention later.

Sliding window stays at 20 requests per hour (was 5 — bumped because users are now identified, not anonymous).

### 7.3 `app/api/audit/route.ts`

```ts
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(401, "Sign in to run an audit.", "auth_required");
  }
  // rate limit by userId
  // pass userId to AuditService.persist
  // ... rest unchanged
}
```

## 8. Environment variables

New required:

- `CLERK_PUBLISHABLE_KEY` — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` actually (must be NEXT_PUBLIC for client components)
- `CLERK_SECRET_KEY` — server-only

Both added to `.env.example`, `.env.local`, and Vercel.

`AUDIT_RATE_LIMIT_PER_HOUR` — optional, default 20.

## 9. Testing strategy

- **Unit tests** updated:
  - `audit.test.ts` — `listByUser` happy path + empty case
  - `claude.test.ts` — fixture unchanged, still works
- **Route tests:**
  - `/api/audit` returns 401 when not signed in
  - `/api/audit` writes user_id when signed in (mock Clerk auth)
- **E2E (Playwright):**
  - Sign-up flow → land on home → submit audit → see in dashboard
  - Sign-out → audit form replaced by sign-up CTA

## 10. Rollout

1. DB migration applied to dev Supabase (manual paste in SQL editor).
2. Code merged + Vercel deploys.
3. DB migration applied to prod Supabase (same SQL, same project for now since Josh reuses dev creds).
4. Clerk env vars added to Vercel (production environment).
5. Smoke test: sign up on prod, run an audit, see it in `/audits`.

## 11. Backward compatibility checklist

- [x] Existing `audit_json` blobs render unchanged
- [x] Existing slug URLs stay accessible (`/audit/I0Bm1ZMh6w` etc.)
- [x] Existing rows have `user_id = NULL` after migration
- [x] Anonymous viewers see no difference — same report page
- [x] Old GitHub Actions CI still passes (placeholder env vars cover Clerk too — add CLERK_* placeholder to ci.yml)

## 12. Open questions

None right now. Ready for plan.
