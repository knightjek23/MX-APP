# Legible

AI-powered MX (Machine Experience) annotation tool for Figma. Audits design files and generates machine-readability notes for the 51% of web traffic that is now non-human.

Single source of truth for this project is `PROJECT.md` — read it before making changes.

## Stack

- Next.js 15 (App Router, RSC) on Vercel
- Supabase (Postgres)
- Anthropic Sonnet 4.5 via structured tool-use
- Upstash Redis for rate limits
- Clerk + Stripe land in Month 1

## Local setup

Prerequisites: Node 20+, pnpm 9+, a Supabase project, Anthropic API key, Upstash Redis instance.

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in keys
cp .env.example .env.local
# Edit .env.local with your Anthropic, Supabase, and Upstash credentials

# 3. Apply database migrations
# Option A (if you have Supabase CLI linked):
supabase db push

# Option B: paste the SQL in supabase/migrations/001_initial_audits_table.sql
# into the Supabase SQL editor for your dev project.

# 4. Run the dev server
pnpm dev
```

Visit `http://localhost:3000`.

## Scripts

- `pnpm dev` — start local dev server
- `pnpm build` — production build
- `pnpm start` — run production build locally
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript check
- `pnpm test` — Vitest (unit)
- `pnpm test:e2e` — Playwright (E2E)

## Deploy

Production deploys happen via Vercel on merge to `main`. Never deploy from a laptop.

1. Create a Vercel project, connect the GitHub repo
2. Add environment variables from `.env.example` (use a separate Supabase + Anthropic key set for prod)
3. Enable Upstash KV integration in Vercel (provisions `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` automatically)
4. Enable Supabase integration — point it at the prod Supabase project
5. First deploy: open a PR, verify preview works, then merge
6. Smoke test prod: `curl https://legible.design/api/health` should return `{ sha, figma: "ok", claude: "ok", supabase: "ok" }`

## Project conventions

- All external APIs go through service classes in `lib/services/`. Zero raw `fetch()` in route handlers.
- Never log Figma PATs or OAuth tokens. The logger in `lib/logger/` redacts anything matching `figd_[A-Za-z0-9_-]+` or `Bearer .+`.
- All timestamps are stored as `timestamptz` in UTC. Convert to local time only in client components.
- Dark mode is mandatory. Every color token must adapt.

## See also

- `PROJECT.md` — full spec, decision log, and prompt-by-prompt build plan
- `supabase/migrations/` — database schema changes (version-controlled)
