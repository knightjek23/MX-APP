# Legible

> AI-powered MX (Machine Experience) annotation tool for Figma. Audits design files and generates machine-readability notes so designs render cleanly for the 51% of web traffic that is now non-human (ChatGPT Atlas, Perplexity Comet, Google Mariner, and other autonomous agents).

This document is a self-contained handoff from ideation → build. It is the single source of truth for the project. Any fresh Claude Code session should read this file first before making decisions.

**Doc version:** v2 (2026-04-18) — kickoff revision. See Section 15 (Decision Log) for what changed since v1.

---

## 0. Quick Reference

- **Product name:** Legible
- **Domain target:** `legible.design` (primary), `legible.ai` (fallback)
- **Stack:** Next.js 15 App Router + RSC, Supabase, Vercel, Upstash Redis, Anthropic Sonnet 4.5
- **Auth/billing:** Clerk + Stripe added Month 1
- **Week 1 deliverable:** paste Figma URL → shareable `/audit/[slug]` report
- **Week 1.5 deliverable:** Figma OAuth replaces PAT input
- **Success gate (2 weeks post-ship):** 5+ designers say "genuinely useful" unprompted, 1+ asks "how much?" unprompted, 0 critical bugs
- **Pricing model:** per-audit credits. First 3 free, then credit packs. Seat billing deferred until team-shaped signal emerges.
- **Build start:** "Read PROJECT.md. Run Prompt 1 from section 9."

---

## 1. Product Vision

### The one-liner

An AI co-pilot that lives inside your Figma workflow and auto-generates MX annotations on components, frames, and design system tokens. Designers ship files with notes that tell developers how to make the resulting product readable by AI agents, not just humans.

### Why now

- **Automated traffic surpassed human traffic in 2024** — 51% of web interactions are non-human. This is already the case, not a future trend.
- **Agent browsers are shipping** — ChatGPT Atlas, Perplexity Comet, and Google Project Mariner browse sites autonomously today. They parse the accessibility tree, the DOM, and in some cases pixel vision.
- **The gap is real** — A UC Berkeley / University of Michigan CHI 2026 study found agent task success drops from 78% to 28% when the accessibility tree is impoverished. Most product sites are in that impoverished range.
- **Designers don't know MX exists yet** — 93% of designers use generative AI tools (NN Group), but 54% of their clients want AI without clear use cases. MX annotation is the concrete use case.
- **Same plumbing, different buyer** — The a11y annotation plugin market exists (eBay Include, BrowserStack, Indeed, GitHub) but is framed as WCAG compliance. Compliance is a checkbox that gets deferred. MX is framed as conversion and revenue — AI-sourced visitors convert at ~27% vs 2.1% from traditional search. Same technical output, 10x the urgency.

### The wedge vs. existing a11y plugins

Two pieces of scope no a11y plugin covers:

1. **Schema markup recommendations per component** — Product, Offer, FAQPage, HowTo, Article, CreateAction. None of the a11y plugins do this because it's not an accessibility concern, but it's core to agent understanding.
2. **Entity consistency audits across the file** — flagging when the same product/feature/page is named three different ways across five frames. Agents get confused; a11y plugins don't check for it.

### Target user

Primary: solo designers and small product teams shipping B2B SaaS. They already care about Dev Mode handoff quality. MX annotations are a natural extension of "what else does the dev need to know."

Secondary: design system leads at mid-size companies building internal libraries. One-time audit of the library prevents thousands of downstream MX issues.

### Positioning

- **NOT "another a11y plugin"** — avoid inheriting the free/compliance pricing gravity.
- **IS "your designs are invisible to the bots buying on behalf of your customers"** — marketing/revenue framing supports credit-based pricing with room to expand.

---

## 2. Validated v1 System Prompt

The v0 prompt was validated against a real SoloDesk dashboard frame and passed the 80% useful threshold. The v1 prompt below incorporates tuning notes from that run and the v2 decisions from 2026-04-18 (tool-use output, single-frame entity mode, log-curve scoring).

### Tuning added since v0

- Color contrast check (WCAG + agent OCR)
- Hardcoded personalization detection ("Good morning, Josh" — is it bound or literal?)
- Cross-frame entity detection (full-file only — skip for single-frame audits)
- Empty/placeholder state semantics

### Output mechanism

**Claude returns structured output via tool use, not free-text JSON.** `AuditResultSchema` (Section 4) is registered as the `input_schema` of a tool called `submit_audit`. `tool_choice` is forced to that tool. There is no JSON parsing or fence-stripping — the SDK delivers a typed `ToolUseBlock` directly. See Section 3 for the `ClaudeService` implementation pattern.

### The prompt

```
You are an MX (Machine Experience) auditor for UX/UI designs. Your job: generate
annotations that tell designers how to make their designs readable by AI agents
(ChatGPT Atlas, Perplexity Comet, Google Mariner, and other autonomous browsers).

Context:
- 51% of web traffic is now non-human
- Agents parse sites via vision (screenshot), accessibility tree (DOM), or hybrid
- Agent task success drops from 78% to 28% when accessibility tree is impoverished
- Same signals that help screen readers help agents, plus: schema markup, entity
  naming consistency, and content in initial HTML

For each frame/component provided, generate annotations covering:
1. Semantic HTML element (header, nav, main, article, section, button, a, form, etc.)
2. Required ARIA attributes — only when native semantics are insufficient
3. Schema markup type + key properties (Product, Offer, FAQPage, HowTo, Article,
   CreateAction, WebApplication, etc.)
4. Hidden-content warnings (accordions, tabs, modals hiding key info)
5. Entity naming inconsistencies across frames (FULL-FILE AUDITS ONLY — see scope note)
6. Initial HTML warnings (content that shouldn't be JS-only rendered)
7. Contrast issues (WCAG AA minimum — fails both a11y and agent OCR)
8. Personalization bindings (is a literal string meant to be dynamic?)
9. Empty/zero-state semantics (what renders when lists are empty?)
10. Figma-specific export hazards (gradient-filled text → transparent clipped text,
    auto-layout exports that lose semantics, text-as-image hazards)

Scope mode:
- If the user message indicates "single-frame scope", skip category 5 (entity
  conflicts) and return entity_conflicts as an empty array. Do not flag anything
  as an entity conflict when only one frame is available.
- If "full-file scope", run category 5 normally.

Priority:
- P1: agent cannot parse (div soup, hidden prices, missing landmarks, gradient text)
- P2: agent misinterprets (ambiguous CTAs, missing entity metadata, unbound personalization)
- P3: agent has less context than ideal (missing schema, no datetime attr, no zero-states)

Call the `submit_audit` tool with your audit. The tool's input schema defines the
exact shape — do not produce prose before, after, or instead of the tool call.

Rules:
- Never recommend ARIA that duplicates native HTML semantics (no div role="button")
- Flag only high-confidence issues — silence beats noise
- Decorative frames return empty annotations array
- Prefer <button>, <a href>, <select> over custom div/span with onclick
- If you cannot tell whether a string is bound or literal, flag as P2 personalization
- Compute overall_score using the log-curve formula: score = max(0, 100 -
  ceil(log2(p1 + 1) * 12) - (p2 * 3) - (p3 * 1)). This keeps discrimination across
  the full range from a clean frame to a severely broken one.
```

### Prompt tuning backlog (v2 → v3)

- Few-shot examples (3): pricing card, primary nav, form field
- Design-system-aware mode — take the file's library as input and flag component drift
- Localization/i18n checks (text as variable vs literal)
- Dark mode parity checks

---

## 3. Architecture

Stack matches Josh's default:

- **Frontend + API**: Next.js 15 (App Router, React Server Components) on Vercel
- **Database**: Supabase (Postgres + auth-ready)
- **Auth**: Clerk (added Month 1, not Week 1)
- **Payments**: Stripe (added Month 1, credit pack purchases)
- **Rate limiting**: Upstash Redis
- **Observability**: Supabase logging + Sentry (Sentry added Month 1)
- **AI**: Anthropic SDK, Sonnet 4.5 via tool-use structured output

### Data flow

```
User
  │
  ▼
Next.js App (Vercel)
  │
  ├── POST /api/audit (Server Action)
  │     ├── validate input (zod)
  │     ├── rate-limit (Upstash, 5/hr anon Week 1)
  │     ├── FigmaService.fetchFile(fileId, nodeId?, pat OR oauthToken)
  │     ├── compactTree(rawFigmaTree) → token-budgeted tree
  │     ├── ClaudeService.audit(tree, { fullFile: boolean }) → tool-use result
  │     ├── AuditService.persist(inputs, outputs, metrics)
  │     └── return { audit_id, slug }
  │
  ├── GET /audit/[slug] (Server Component)
  │     ├── AuditService.fetch(slug)
  │     └── render <AuditReport />
  │
  ├── GET /api/health
  │     └── { sha, figma: ok|err, claude: ok|err, supabase: ok|err }
  │
  ├── GET /auth/figma/callback (Week 1.5)
  │     └── Figma OAuth exchange → short-lived token stored in session
  │
  └── GET /og/[slug] (Week 2)
        └── generated OG image for shared reports
```

### Service layer contract

All external calls go through a typed service class. No `fetch()` in route handlers.

```ts
// lib/services/figma.ts
export class FigmaService {
  constructor(private token: string) {} // PAT or OAuth access token — interchangeable
  async fetchFile(fileId: string, nodeId?: string): Promise<FigmaTree> { /* ... */ }
  async fetchImage(fileId: string, nodeId: string): Promise<string> { /* thumbnail */ }
}

// lib/services/claude.ts
export class ClaudeService {
  constructor(private apiKey: string) {}

  // Uses Anthropic tool-use with AuditResultSchema as input_schema.
  // tool_choice forced to submit_audit. No JSON parsing on output.
  async audit(tree: CompactFigmaTree, opts: {
    fullFile: boolean;
    frameCount: number;
  }): Promise<AuditResult & AuditMetrics> { /* ... */ }
}

// lib/services/audit.ts
export class AuditService {
  constructor(private db: SupabaseClient) {}
  async persist(record: AuditRecord): Promise<string /* slug */> { /* ... */ }
  async fetch(slug: string): Promise<AuditRecord | null> { /* ... */ }
}

// lib/services/compact.ts
// Pure function, no class. Takes a raw Figma tree, returns a token-budgeted
// version following the rules in Section 3.1 below.
export function compactTree(tree: FigmaTree): CompactFigmaTree { /* ... */ }
```

### 3.1 Figma tree compaction rules

The Figma API returns verbose trees. Before sending to Claude, strip non-semantic noise.

**Keep:**
- `id`, `name`, `type`, `children`
- `characters` (text content for TEXT nodes)
- `style.fontSize`, `style.fontWeight`, `style.fontFamily`
- Primary fill color (hex) — first visible, non-image fill
- `componentId` (for dedup / component drift detection)
- `layoutMode` (auto-layout structure signal)
- `visible`, `opacity` (hidden-content detection; opacity < 0.5 flagged)

**Strip:**
- `absoluteBoundingBox`, geometry
- `effects` (shadows, blurs, glass)
- `exportSettings`, transitions, `preserveRatio`, `blendMode`
- Stroke details (weight, align, dashes)
- Corner radius (individual corners)
- Image refs → replace with `{type:"IMAGE"}` marker
- Style references unless they reveal design-system tokens

**Compression tactics:**
- Flatten groups that contain a single child (preserve layer name as metadata)
- Deduplicate repeated component instances (send one canonical + a count)
- Truncate text nodes over 500 characters with `…` marker

**Budget:**
- Target ~70% token reduction vs raw API response
- Warn if compacted tree > 80k tokens (logged in audit metrics)
- Throw `FileTooLargeError` if compacted tree > 120k tokens
- Hard frame cap: reject files with > 50 frames before compaction runs (Section 5.4 covers UX)

### 3.2 ClaudeService tool-use pattern

```ts
// Conceptual — see lib/services/claude.ts for real code
const AUDIT_TOOL = {
  name: "submit_audit",
  description: "Submit the MX audit for this Figma design.",
  input_schema: zodToJsonSchema(AuditResultSchema),
};

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 8192,
  system: MX_AUDITOR_PROMPT,
  tools: [AUDIT_TOOL],
  tool_choice: { type: "tool", name: "submit_audit" },
  messages: [{
    role: "user",
    content: JSON.stringify({
      scope: opts.fullFile ? "full-file" : "single-frame",
      frame_count: opts.frameCount,
      tree: compactedTree,
    }),
  }],
});

const toolUse = response.content.find(block => block.type === "tool_use");
if (!toolUse) throw new ClaudeNoToolUseError();
const validated = AuditResultSchema.parse(toolUse.input);
return {
  ...validated,
  tokens_input: response.usage.input_tokens,
  tokens_output: response.usage.output_tokens,
  latency_ms: /* measure around the call */,
  cost_usd: calculateCost(response.usage),
};
```

No JSON string parsing. No retry on malformed JSON because there is no JSON string. If the tool use is somehow missing (Anthropic returns plain text fallback) we throw `ClaudeNoToolUseError` and bubble up a user-readable error.

### Supabase schema (Week 1)

```sql
create table audits (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  figma_file_id text not null,
  figma_node_id text,
  figma_url text not null,
  scope text not null check (scope in ('full-file', 'single-frame')),
  frame_count integer not null,
  run_at_utc timestamptz not null default now(),
  model text not null,
  latency_ms integer,
  tokens_input integer,
  tokens_output integer,
  tokens_compacted integer, -- post-compaction size for observability
  cost_usd numeric(10,4),
  audit_json jsonb not null,
  error text,
  user_ip_hash text, -- sha256 hash for rate limiting and abuse only
  created_at timestamptz not null default now()
);

create index audits_slug_idx on audits(slug);
create index audits_run_at_idx on audits(run_at_utc desc);
```

No `user_id` column until Clerk integration. Slug is `nanoid(10)` for shareable URLs. `tokens_compacted` is new in v2 — lets us tune compaction rules post-launch with real data.

### Env vars

```bash
# .env.local
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# VERCEL_GIT_COMMIT_SHA is set by Vercel automatically in preview/prod builds
# Week 1.5 additions:
FIGMA_OAUTH_CLIENT_ID=
FIGMA_OAUTH_CLIENT_SECRET=
FIGMA_OAUTH_REDIRECT_URI=
```

Separate Supabase and Anthropic keys for dev vs prod with separate spend alerts ($50/mo dev, $200/mo prod). Never commit `.env.local`.

---

## 4. Output JSON Schema

This is the contract between `ClaudeService.audit()` and `<AuditReport />`. It doubles as the `input_schema` for the `submit_audit` tool — Claude fills it via structured tool use. Zod-validated on the server.

```ts
// lib/types/audit.ts
import { z } from "zod";

export const PrioritySchema = z.enum(["P1", "P2", "P3"]);

export const CategorySchema = z.enum([
  "semantic_html",
  "aria",
  "schema",
  "hidden_content",
  "entity",
  "initial_html",
  "contrast",
  "personalization",
  "empty_state",
  "figma_export"
]);

export const AnnotationSchema = z.object({
  priority: PrioritySchema,
  category: CategorySchema,
  recommendation: z.string().min(10).max(800),
  rationale: z.string().min(10).max(600),
  code_hint: z.string().nullable()
});

export const FrameAuditSchema = z.object({
  node_id: z.string(),
  name: z.string(),
  annotations: z.array(AnnotationSchema)
});

export const EntityConflictSchema = z.object({
  variants: z.array(z.string()).min(2),
  occurrences: z.array(z.object({
    node_id: z.string(),
    variant: z.string()
  })),
  recommended: z.string()
});

export const AuditSummarySchema = z.object({
  p1_count: z.number().int().nonnegative(),
  p2_count: z.number().int().nonnegative(),
  p3_count: z.number().int().nonnegative(),
  overall_score: z.number().int().min(0).max(100)
});

export const AuditResultSchema = z.object({
  audit_version: z.literal("v1"),
  scope: z.enum(["full-file", "single-frame"]),
  frames: z.array(FrameAuditSchema),
  entity_conflicts: z.array(EntityConflictSchema), // always [] when scope = single-frame
  summary: AuditSummarySchema
});

export type AuditResult = z.infer<typeof AuditResultSchema>;
```

**Score computation (verify Claude computed it right on our side too):**

```ts
// lib/scoring.ts
export function computeScore(p1: number, p2: number, p3: number): number {
  const p1Penalty = Math.ceil(Math.log2(p1 + 1) * 12);
  return Math.max(0, 100 - p1Penalty - p2 * 3 - p3 * 1);
}
// Sanity: 0 P1 = 100. 1 P1 = 88. 6 P1 = ~66 (SoloDesk parity-ish).
// 10 P1 = ~58. 20 P1 = ~48. 40 P1 = ~37. 100 P1 = ~20.
// Never floors prematurely. Still bounded at 0.
```

The server recomputes the score from counts rather than trusting what the LLM returned. If they diverge by more than 2 points, log a warning and use the server computation.

---

## 5. Week 1 Scope

### 5.1 In scope — Week 1 (launch)

- Landing page at `/` with one form: Figma file URL + optional node ID + Figma PAT
- Server action `POST /api/audit` that runs the audit and persists to Supabase
- Report page at `/audit/[slug]` rendering the full audit
- Health check at `/api/health`
- Rate limit: 5 audits/hour per IP (Upstash)
- Error handling for: invalid URL, expired PAT, Claude rate limit / 529, Supabase down, oversized file (> 50 frames → hard reject), oversized post-compaction (> 120k tokens → hard reject)
- CI/CD: GitHub → Vercel previews on PR, main → production
- Observability: every audit run logged to Supabase with tokens, latency, cost, error, compacted size

### 5.2 Week 1.5 — OAuth replacement

Ship **within 7 days of Week 1 launch.** The PAT form is replaced by a "Connect Figma" OAuth button. Flow:

1. User clicks "Connect Figma" → redirect to Figma OAuth consent (scope: `file_read`)
2. Callback at `/auth/figma/callback` exchanges code for access token
3. Token stored in an httpOnly, short-lived session cookie (no DB persistence)
4. User lands on an authenticated form: just paste Figma URL, no PAT field

PAT remains supported as a fallback for the first few weeks (Figma OAuth requires app approval; if that hits delays, PAT keeps the funnel alive).

### 5.3 Out of scope (move to Month 1 or later)

- Clerk auth (Month 1 — when billing lands)
- Stripe billing (Month 1 — credit pack purchases: $5 for 5 audits, $20 for 25 audits, $60 for 100 audits — lock pricing after 20-designer validation)
- Figma plugin (Month 2 — web app validates first)
- Code export (Month 2 — `.tsx`/`.html` generation with semantic HTML + JSON-LD)
- Per-frame thumbnails (nice-to-have Week 2)
- OG image generation (Week 2)
- Frame deep-link back to Figma node (Week 2)
- Export report as PDF (Week 2)

### 5.4 Oversized file UX

When input file has > 50 frames:

```
We can audit up to 50 frames per run right now. This file has 83.

Two options:
  1. Scope to one frame — right-click a frame in Figma → Copy link → paste that URL
  2. Split the file — audit each page separately

Paid plans (coming soon) will handle larger files.
```

Same hard-reject UX when post-compaction tree exceeds 120k tokens, worded as "This file is too dense for a single audit." Paid tier will unlock bigger files later; this is a natural upgrade path.

### 5.5 Success criteria

Ship the URL to 20 designers in Josh's network (see Section 14 for the list template and outreach plan). Within 2 weeks:

- 5+ say "this is genuinely useful" unprompted
- 1+ asks "how much?" unprompted
- 0 critical bugs (silent data loss, wrong output shown to wrong user)

If those criteria hit, build Month 1. If they don't, revisit prompt quality or positioning before adding code.

---

## 6. Dev Principles Applied

Josh's standing rules, mapped to Legible. Non-negotiable for Week 1.

| Principle | Applied to Legible |
|---|---|
| Secrets in env vars; separate dev/prod | Separate Supabase projects. Separate Anthropic keys with separate spend alerts ($50/mo dev, $200/mo prod). |
| Observability from day one | Every audit run → Supabase row with tokens (raw + compacted), latency, cost, error. `/api/health` endpoint with build SHA. Sentry deferred to Month 1. |
| External APIs wrapped in service layer | `FigmaService`, `ClaudeService`, `AuditService`. Pure `compactTree` function. Zero direct `fetch()` in route handlers. |
| Rate limiting on auth and write endpoints | Upstash Redis on `POST /api/audit`. 5/hr anonymous Week 1, keyed by hashed IP. |
| Server-side input validation | Zod on URL shape (regex: `figma.com/(file|design)/...`), PAT format, node ID format. Reject malformed early. |
| Plan architecture early; proper DB migrations | Supabase migrations in `/supabase/migrations/`. Version-controlled from first commit. |
| Real staging mirroring production | Vercel previews on every PR. Preview deploys connect to a `staging` Supabase branch. |
| Document run and deploy steps | `README.md` covers local setup + deploy. `/api/health` documents expected env. |
| CI/CD from the start | GitHub Actions: lint + typecheck + test on PR. Vercel auto-deploys main to prod. Never deploy from laptop. |
| No "fix later" — fix or ticket | Anything deferred has a date in section 5 above. |
| Test unhappy paths and backup restores | Playwright E2E for: bad URL, expired PAT, Claude rate limit, Supabase down, oversized file, missing tool_use in response. Supabase daily backups, restore drill Month 2. |
| All timestamps UTC; convert on display | Every `timestamptz` in DB. `toLocaleString()` only in client components with user's timezone. |

### Figma PAT / OAuth handling (security-critical)

- **Week 1:** PAT is pasted into the form, used immediately, and **never persisted**
- **Week 1.5:** OAuth access token lives in an httpOnly session cookie only; never in DB
- Neither PAT nor OAuth token is logged (explicit filter in logger config matches `figd_[A-Za-z0-9_-]+` and `Bearer .+`)
- PAT/token is not sent to Claude — only the compacted Figma tree is sent
- The `user_ip_hash` column stores SHA-256, not raw IP
- `audit_json` stores the audit output only, never the Figma token or raw API response headers

---

## 7. UI Spec

### Landing page (`/`)

Single-purpose. One hero, one form, one example output below the fold.

**Hero:**
- H1: "Your designs are invisible to the AI agents buying on behalf of your users."
- Sub: "Legible audits your Figma file and tells you what to fix before you ship."
- Stat callout (one line, subtle): "51% of web traffic is non-human. Most sites are built for the other 49%."

**Form (Week 1):**
- Figma URL (required, text input, validated)
- Figma node ID (optional, text input — shown as "Scope to a frame?" collapsible)
- Figma PAT (required, password input, with "How do I get a PAT?" helper link + 90-second video)
- Submit button: "Run audit"

**Form (Week 1.5):**
- "Connect Figma" OAuth button (primary)
- Paste URL after connect
- PAT field hidden behind "Use personal access token instead" disclosure for power users

**Pricing line below the form:**
- "First 3 audits free. After that, credit packs starting at $5."
- Links to `/pricing` which is a `<h1>Pricing</h1><p>Coming soon. Beta is free.</p>` stub in Week 1.

**Below the fold:**
- One real audit output from the SoloDesk run — proof of concept (embed the JSON sample from Section 10)
- "What is MX?" short explainer (3-4 paragraphs max)
- Footer: Anthropic-powered, no affiliation

### Report page (`/audit/[slug]`)

The mockup rendered in the conversation is the target. Components, top-down:

**Header row**
- Left: "MX audit" eyebrow, frame name (h1, 18px/500), meta line (Frame ID · Run date · Model · Scope: Full file / Single frame)
- Right: MX score (30px/500) out of 100, color-coded
  - 90–100: text-success
  - 70–89: text-warning
  - 0–69: text-danger

**Summary grid (4 cards)**
- Critical (P1) — danger background, count + "P1" label
- Important (P2) — warning background, count + "P2" label
- Suggested (P3) — info background, count + "P3" label
- Entity conflicts — neutral background, count
  - **When scope = single-frame:** card shown greyed out with copy "Audit a full file to detect entity inconsistencies across frames." Include CTA linking to `/` with the file URL pre-populated (no node_id) so users learn the full-file feature exists.

**Filter chips (category)**
- "All · N" (default selected, primary border)
- One chip per category present: Semantic HTML, ARIA, Schema, Initial HTML, Entity, Contrast, Personalization, etc.
- Clicking filters the annotation list below

**Annotation cards (list)**

Each annotation is a card:
- Top row: priority pill (P1/P2/P3 colored) + category label + "N of total" counter
- Title (15px/500): the recommendation as a headline
- Body (13px regular): the rationale
- Collapsible "Suggested markup" footer — expanded by default on the first P1, collapsed on all others
  - Monospace code block in `--color-background-secondary`
  - "Copy" button top-right
  - Uses `code_hint` field verbatim

**Footer actions**
- Export report (Week 2: PDF, Week 1: copy link)
- Re-run audit (re-fetches file, new run)
- Open in Figma (deep link to file or node)

### Color + typography rules

- Follow shadcn/ui defaults
- Semantic colors: danger (P1), warning (P2), info (P3)
- Typography: Inter for UI, JetBrains Mono for code blocks
- Spacing: 1rem / 1.25rem / 1.5rem vertical rhythm
- All cards: white bg, 0.5px border, 12px radius

### Dark mode

Mandatory. Every color uses a token that adapts. Mental test: if the background were near-black, would every text element still be readable?

---

## 8. File Structure

Proposed repo layout. Claude Code should create this on first run.

```
legible/
├── .github/
│   └── workflows/
│       └── ci.yml                # lint, typecheck, test, build on PR
├── .env.example
├── .gitignore
├── README.md                     # setup, run, deploy
├── PROJECT.md                    # this file
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json               # shadcn config
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_audits_table.sql
│   └── config.toml
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # landing
│   ├── globals.css
│   ├── pricing/
│   │   └── page.tsx              # "Coming soon. Beta is free." stub
│   ├── audit/
│   │   └── [slug]/
│   │       └── page.tsx          # report (RSC)
│   ├── auth/
│   │   └── figma/
│   │       └── callback/
│   │           └── route.ts      # Week 1.5: OAuth exchange
│   └── api/
│       ├── audit/
│       │   └── route.ts          # POST handler (calls server action)
│       └── health/
│           └── route.ts
├── lib/
│   ├── services/
│   │   ├── figma.ts
│   │   ├── claude.ts
│   │   └── audit.ts
│   ├── compact.ts                # pure function: raw FigmaTree → CompactFigmaTree
│   ├── scoring.ts                # computeScore(p1, p2, p3)
│   ├── prompts/
│   │   └── mx-auditor.ts         # the system prompt as a typed string
│   ├── types/
│   │   ├── audit.ts              # zod schemas from section 4
│   │   └── figma.ts              # Figma API types
│   ├── db/
│   │   └── supabase.ts           # client factory (server + browser)
│   ├── rate-limit/
│   │   └── index.ts              # Upstash wrapper
│   ├── validation/
│   │   └── figma-url.ts          # URL parser + validator
│   └── logger/
│       └── index.ts              # structured logger (no token leakage)
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── audit-form.tsx            # landing page form (client)
│   ├── audit-report.tsx          # report root (server)
│   ├── annotation-card.tsx
│   ├── summary-grid.tsx
│   ├── entity-conflicts-card.tsx # handles single-frame greyed-out state
│   ├── filter-chips.tsx
│   └── score-badge.tsx
├── __tests__/
│   ├── services/
│   │   ├── figma.test.ts
│   │   ├── claude.test.ts
│   │   └── audit.test.ts
│   ├── compact.test.ts           # compaction reduces size, keeps semantics
│   ├── scoring.test.ts           # log-curve sanity at known counts
│   └── validation/
│       └── figma-url.test.ts
└── e2e/
    └── happy-path.spec.ts        # Playwright
```

---

## 9. First Prompts for Claude Code

Copy-paste these in sequence. Each one builds on the last. Wait for Claude Code to finish and verify before moving to the next.

### Prompt 1 — Scaffold

```
Read PROJECT.md in the repo root. It is the source of truth for this project.

Initialize the Legible project according to section 8 (File Structure):
1. `pnpm create next-app` with TypeScript, App Router, Tailwind, ESLint, src-less layout, no Turbopack
2. Install shadcn/ui and initialize it
3. Install these deps: @anthropic-ai/sdk, @supabase/supabase-js, zod, zod-to-json-schema, nanoid, @upstash/ratelimit, @upstash/redis
4. Install dev deps: vitest, @vitest/ui, @playwright/test, @types/node
5. Create the folder structure from section 8 with empty placeholder files
6. Add a `.env.example` with the variables from section 3
7. Write `README.md` with local setup steps (pnpm install, copy env, pnpm dev) and deploy steps (Vercel)
8. Commit: "scaffold: initial Next.js + shadcn + deps"

Do not implement any service logic yet. Stop after scaffolding and commit.
```

### Prompt 2 — Types, scoring, prompt

```
Read PROJECT.md sections 2, 4, and 7.

Implement:
1. `lib/types/audit.ts` — all Zod schemas from section 4, exported with TypeScript types
2. `lib/types/figma.ts` — minimal Figma API types we need (File, Node, Document). Source from https://www.figma.com/developers/api
3. `lib/prompts/mx-auditor.ts` — export the v1 system prompt from section 2 as a const.
4. `lib/scoring.ts` — computeScore(p1, p2, p3) using the log-curve formula from section 4.
5. `lib/validation/figma-url.ts` — parse a Figma URL into { fileId, nodeId? }. Handle both /file/ and /design/ formats. Throw on malformed input with a user-readable error.
6. `__tests__/scoring.test.ts` — verify scores at key counts: (0,0,0)=100, (1,0,0)=88, (6,4,3)=~66, (40,0,0)>0, (100,0,0)>0.
7. `__tests__/validation/figma-url.test.ts` — 5+ cases: valid file URL, valid design URL, URL with node-id, invalid host, malformed path

Run vitest to verify tests pass. Commit: "types + prompt + scoring + url validation"
```

### Prompt 3 — Compaction + service layer

```
Read PROJECT.md sections 3, 3.1, 3.2, and 6. Pay close attention to Figma token handling.

Implement the compaction function and three service classes:

1. `lib/compact.ts` — pure function compactTree(raw). Follow the keep/strip rules in section 3.1.
   Flatten single-child groups, dedupe repeated component instances, truncate text >500 chars.
   Export a helper countTokens(tree) using tiktoken or a 4-chars-per-token estimator.

2. `lib/services/figma.ts` — FigmaService class
   - Constructor takes a token (PAT or OAuth access token — interchangeable)
   - fetchFile(fileId, nodeId?) returns parsed tree, optionally scoped via ?ids=nodeId&depth=3
   - Throw typed errors: InvalidTokenError, FileNotFoundError, FigmaApiError
   - NEVER log the token

3. `lib/services/claude.ts` — ClaudeService class using tool-use pattern from section 3.2
   - Constructor takes API key
   - audit(compactedTree, { fullFile, frameCount }) calls Anthropic Sonnet 4.5
   - Registers AuditResultSchema as submit_audit tool via zod-to-json-schema
   - Forces tool_choice to submit_audit
   - Extracts tool_use block, validates input with AuditResultSchema
   - Throws ClaudeNoToolUseError if model returned text instead of tool use
   - Returns validated AuditResult + metrics (tokens_input, tokens_output, latency_ms, cost_usd, tokens_compacted)
   - Cost calc: $3/M input, $15/M output (Sonnet 4.5 — verify in code comment against current pricing)

4. `lib/services/audit.ts` — AuditService class
   - Constructor takes Supabase client
   - persist(record) inserts into audits table, returns generated slug (nanoid(10))
   - fetch(slug) returns audit or null

5. `lib/logger/index.ts` — simple structured logger. Redacts anything matching PAT shape (figd_[A-Za-z0-9_-]+) and Bearer tokens.

6. `__tests__/compact.test.ts` — verify compaction reduces a sample raw tree by 60%+ while preserving all names, types, text content, and hierarchy.

7. `__tests__/services/*.test.ts` — mock external APIs, test happy path + each error type.

Run vitest. Commit: "service layer: compact, figma, claude (tool-use), audit"
```

### Prompt 4 — API route + rate limiting

```
Read PROJECT.md sections 3, 5, and 6.

Implement:
1. `lib/rate-limit/index.ts` — Upstash Ratelimit wrapper. 5 requests per 1 hour, sliding window, keyed by SHA-256 hashed IP.
2. `lib/db/supabase.ts` — server-side Supabase client factory using SERVICE_ROLE_KEY.
3. `supabase/migrations/001_initial_audits_table.sql` — schema from section 3.
4. `app/api/audit/route.ts` — POST handler:
   - Parse body with Zod (figma_url, figma_pat, node_id?)
   - Rate limit by hashed IP
   - Parse URL → fileId + nodeId
   - FigmaService.fetchFile()
   - count frames in raw tree — if > 50, throw OversizedFileError with scope-to-frame UX copy
   - compactTree()
   - if compacted tokens > 120k, throw OversizedPostCompactionError
   - scope = nodeId ? 'single-frame' : 'full-file'
   - ClaudeService.audit() with { fullFile: scope === 'full-file', frameCount }
   - Recompute score server-side, warn in logs if divergence > 2
   - AuditService.persist()
   - Return { audit_id, slug }
   - Catch each error class and return appropriate status + user-readable message
   - Never leak token in error messages or logs
5. `app/api/health/route.ts` — check DB connectivity, Claude API reachable, Figma API reachable. Return { sha: process.env.VERCEL_GIT_COMMIT_SHA, figma, claude, supabase }.

Write Playwright E2E in `e2e/happy-path.spec.ts` covering: valid submit → report URL, invalid URL → error, expired PAT → error, oversized file → scope-to-frame copy.

Commit: "api routes + rate limit + migrations"
```

### Prompt 5 — UI

```
Read PROJECT.md section 7 (UI Spec).

Implement components:
1. `components/audit-form.tsx` — client component, the landing form. React Hook Form + Zod. Disable submit during pending. Show error toast on failure. Redirect to /audit/[slug] on success.
2. `components/summary-grid.tsx` — 4-card grid (P1/P2/P3/entity) with semantic colors.
3. `components/entity-conflicts-card.tsx` — handles full-file state (count + list) AND single-frame greyed state with upsell CTA that pre-fills the landing form with the file URL (no node_id).
4. `components/filter-chips.tsx` — client component, controlled filter state. Clicking a chip filters the annotation list.
5. `components/annotation-card.tsx` — single annotation. Collapsible code block. Copy-to-clipboard on code.
6. `components/audit-report.tsx` — server component. Takes AuditResult, renders header + summary + chips + annotation list + footer actions. Shows scope badge ("Full file" / "Single frame").
7. `components/score-badge.tsx` — color-coded score display (90+ success, 70+ warning, <70 danger).
8. `app/page.tsx` — landing page. Hero, form, "how it works" section, pricing line ("First 3 audits free").
9. `app/pricing/page.tsx` — stub "Coming soon. Beta is free."
10. `app/audit/[slug]/page.tsx` — server component. Fetches audit from AuditService. Renders AuditReport. Shows 404 if not found.

Use shadcn Button, Input, Badge, Card, Tooltip. Use lucide-react for icons. Follow section 7's color + typography rules.

Dark mode mandatory. Test in both.

Commit: "ui: form + report + components"
```

### Prompt 6 — CI + deploy

```
Read PROJECT.md section 6.

1. `.github/workflows/ci.yml` — on PR: pnpm install, lint, typecheck, vitest, build.
2. Configure Vercel project with env vars from .env.example (use vercel CLI or dashboard — document steps in README).
3. Add Upstash KV integration in Vercel.
4. Add Supabase integration in Vercel (separate dev/prod projects).
5. Verify preview deploy works on a PR.
6. Merge to main, verify prod deploy.
7. Smoke test: hit /api/health on prod. Should return ok for all three.

Commit: "ci + deploy config"
```

### Prompt 7 — Figma OAuth (Week 1.5)

```
Read PROJECT.md sections 5.2 and 6 (PAT/OAuth handling).

1. Register a Figma OAuth app: https://www.figma.com/developers/apps. Scope: file_read. Redirect: https://legible.design/auth/figma/callback
2. Env vars: FIGMA_OAUTH_CLIENT_ID, FIGMA_OAUTH_CLIENT_SECRET, FIGMA_OAUTH_REDIRECT_URI
3. `app/auth/figma/callback/route.ts` — exchange code for access token. Store in httpOnly session cookie (short-lived, 1hr). Redirect to /.
4. Update `components/audit-form.tsx`: show "Connect Figma" button as primary. On connect, replace PAT field with a green "Connected as <user>" badge. Offer "Use PAT instead" disclosure for power users.
5. Update FigmaService to accept either PAT or OAuth token in constructor — no changes needed since it's already a generic token.
6. E2E test: OAuth happy path (mock Figma's token endpoint).

Commit: "auth: figma oauth"
```

---

## 10. Appendix: SoloDesk Validation Sample Output

*[The SoloDesk validation sample from v1 is preserved verbatim in the archived `MX_PROJECT_v1.md`. It remains the reference shape the UI must render. Not reprinted here to keep the live doc focused on current decisions.]*

Key findings that proved the concept:
1. **Gradient-filled text** on invoice rows (Figma-specific export hazard) — caught and correctly flagged P1
2. **Four identical KPI cards** ("Active Projects / 5 / +1 this month") — caught as entity P1
3. **RSC recommendation** for server-rendering KPIs/invoices/deadlines — correctly identified stack-specific fix
4. **CreateAction schema** for quick-action buttons — forward-thinking agent-acting schema
5. **`<time datetime>` wrapping** for "18d" and "2 hours ago" — correctly flagged P2

Summary: 6 P1 / 4 P2 / 3 P3. Under the v2 log-curve formula, that's `100 - ceil(log2(7) * 12) - 12 - 3 = 100 - 34 - 12 - 3 = 51`. Under the v1 linear formula it was 72. The new formula scores a visibly broken frame as visibly broken.

---

## 11. Risks and Open Questions

### Known risks

- **LLM output variance.** Two runs on the same file will produce slightly different annotations. Mitigation: "freeze audit" state per file, versioned so teams argue once, not every time. Log every LLM call input + output to Supabase for debugging drift.
- **72% of AI investments destroy value (McKinsey).** This product could produce volume of notes without value. Mitigation: human-review-before-commit step from day one. Don't let annotations commit to Figma without explicit approval. For Week 1 (web app), every audit is read-only/share-only — no commit risk.
- **Platform dependency.** Figma could ship this natively via Dev Mode. Defensible moat is output quality + schema layer + code export — not the audit itself.
- **Pricing gravity.** A11y plugin market is mostly free/freemium. Don't inherit that. Position as marketing/revenue tool, not compliance tool. Credit-pack pricing avoids the "is this free forever?" trap of freemium while keeping first-try friction low.
- **Name collisions at scale.** Legible is clean in the Figma/a11y space today. As we grow, monitor for a Legible-branded design tool and be ready to defend with brand investment (or pivot if needed).

### Resolved in v2

- ~~Name~~ — locked: **Legible**
- ~~Pricing model~~ — locked: **per-audit credits**, first 3 free, packs start at $5
- ~~Figma plugin UX (first surface)~~ — resolved: web app Week 1 → Figma OAuth Week 1.5 → native plugin Month 2

### Open questions (decide before Month 1)

- **Credit pack pricing** — $5/5, $20/25, $60/100 is a placeholder. Validate after the 20-designer beta. What does "I'd pay for this" look like in real numbers?
- **Team features scope** — shared audit history, team billing, SSO. Month 3 cut line.
- **Figma plugin UX (Month 2)** — annotations as native Figma comments, dedicated annotation nodes, or Dev Mode extension panel?

---

## 12. Quick Reference (Duplicate of Section 0)

**Name:** Legible · `legible.design`
**Stack:** Next.js 15, Supabase, Clerk (M1), Stripe (M1), Vercel, Upstash, Anthropic Sonnet 4.5 (tool-use)
**Week 1 deliverable:** paste Figma URL → get shareable audit report
**Week 1.5 deliverable:** Figma OAuth replaces PAT
**Success gate:** 5 designers say "this is useful", 1 asks "how much?"
**Build start prompt:** "Read PROJECT.md. Run prompt 1 from section 9."

---

## 13. Brand Starter

### Name
**Legible.** Dictionary word = product promise. One syllable of impact.

### Positioning one-liner
"Legible makes your designs readable to the AI agents browsing on your users' behalf."

### Voice
Confident, technical, not precious. Say the concrete thing ("agents parse the accessibility tree"), not the abstract thing ("next-gen digital experiences"). Josh's existing voice guide applies.

### Visual starter (Week 1, ship-blocker)
- Logo wordmark: "legible" in set-caps Inter Tight, tracking tight, slight blur at the edges suggesting "comes into focus" — or just clean Inter SemiBold if that's too cute
- Primary color: single accent that reads as "revealed" — lime green `#B8E600` or an electric indigo `#3B00F2`
- Typography: Inter (UI) + JetBrains Mono (code) — matches Section 7
- Favicon: lowercase "l" in the accent color on a dark square

### Domains to lock today
- `legible.design` (primary, target)
- `legible.ai` (fallback)
- `getlegible.com` (compound fallback)
- `legible.io` (skip unless .design and .ai fail)

### Accounts to create (blocked on domain)
- Vercel team
- Supabase org
- Anthropic API workspace (separate from other projects)
- GitHub repo (private at first: `legible-app`)
- Stripe (Month 1 only)

---

## 14. GTM — 20-Designer Beta List

Ship day is silent without a list. This section is Josh's to fill in. A template is provided.

### Criteria for the 20

Each candidate should meet at least 3 of 5:
1. Designs product, not marketing (B2B SaaS dashboards, tools, internal apps — not landing pages)
2. Ships Figma handoffs to devs regularly (not static mockups that never reach code)
3. Will actually click a link from Josh (warm enough to respond)
4. Has an audience they'd share it with if it lands (Twitter/LinkedIn reach, a newsletter, a community)
5. Designs things where agents buying is a plausible near-term scenario (e-comm adjacent, pricing-driven SaaS, self-serve apps)

### Template

| # | Name | Role | Channel | Notes | Sent | Opened | Replied | Said "useful" | Asked "how much" |
|---|------|------|---------|-------|------|--------|---------|---------------|------------------|
| 1 |  |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |  |
| ... |  |  |  |  |  |  |  |  |  |
| 20 |  |  |  |  |  |  |  |  |  |

Track this in a Google Sheet or Notion. Update daily during the 2-week window.

### Outreach message skeleton

**Purpose:** warm DM/email, one-to-one, personalized top line. Not a newsletter. Not a cold pitch.

```
Hey [first name] —

Been building something I think you'd have a take on. It's a Figma audit tool
called Legible that flags what AI agents can't read in your designs — think
Atlas or Perplexity Comet trying to shop a dashboard. Ran it against my own
SoloDesk file and it caught six things I missed.

Free to try (3 audits on me, no account): [link]

Would love your honest "this is useful / this is a waste of time" take.
If it's useful, tell me how much you'd pay. If it's not, tell me why.

— Josh
```

Personalize the top line per person. The middle and closing stay constant so you can measure apples-to-apples across responses.

### Week-of-launch workflow

- Day 1: ship prod, hit `/api/health`, send to first 5 names (closest contacts — debug real friction before scaling)
- Day 2: fix anything those 5 hit, send to next 10
- Day 4: send to final 5
- Day 7: send gentle follow-up to non-responders ("did you get a chance to try it?")
- Day 14: tally the scoreboard (useful / how much), decide whether to build Month 1

### Want a full outreach sequence?

The skeleton above is the Day 1 message. If you want follow-ups, a "thanks for trying it" message, and a post-audit "what did you think?" nudge — say the word and I'll draft all three using your voice guide.

---

## 15. Decision Log — 2026-04-18

What changed from v1 of this doc:

| # | Area | v1 | v2 |
|---|------|-----|-----|
| 1 | Product name | `mx-notes` (placeholder) | **Legible** — locked |
| 2 | Domain strategy | TBD | `legible.design` primary, `legible.ai` fallback |
| 3 | Pricing model | Open question | **Per-audit credits** — 3 free, packs from $5 |
| 4 | Figma auth | PAT for Week 1, OAuth Month 1 | PAT Week 1, **OAuth Week 1.5** |
| 5 | Claude output mode | JSON response + parse | **Tool-use structured output** — no parsing |
| 6 | Score formula | Linear `100 − (p1×7) − (p2×3) − (p3×1)` floored | **Log curve** on P1: `100 − ceil(log2(p1+1)×12) − (p2×3) − (p3×1)` |
| 7 | Figma tree handling | "Compact summary if >100k tokens" (unspecified) | **Explicit keep/strip rules** in Section 3.1, target 70% reduction, hard cap at 120k |
| 8 | Oversized file (>50 frames) | Handled via "error handling" (unspecified) | **Hard reject** with scope-to-frame UX (Section 5.4) |
| 9 | Entity conflicts + single-frame | Prompt-level conditional only | **UI greyed state + upsell CTA** (Section 7 Summary Grid) |
| 10 | Env var for build SHA | `GIT_SHA` | `VERCEL_GIT_COMMIT_SHA` (Vercel's actual variable) |
| 11 | Recommendation schema max | 600 chars | **800 chars** (SoloDesk sample hit the limit) |
| 12 | Audit table columns | `user_ip` (hashed, unclear) | `user_ip_hash` (SHA-256, explicit) + `tokens_compacted` + `scope` + `frame_count` |
| 13 | Schema: `scope` field | Not present | Added to `AuditResultSchema` — `"full-file" | "single-frame"` |
| 14 | File structure | Had `rate-limit/`, no `compact.ts` or `scoring.ts` | Added `lib/compact.ts`, `lib/scoring.ts`, `components/entity-conflicts-card.tsx` |
| 15 | Landing page | No pricing mention | "First 3 audits free. Packs from $5." stub + `/pricing` route |
| 16 | GTM plan | "Ship to 20 designers" (no structure) | Section 14 with criteria, template, outreach skeleton, week-of workflow |
| 17 | Brand starter | Not present | Section 13 — name, positioning, voice, visual starter, domains |

---

*Last updated: 2026-04-18. This document lives at the root of the Legible repo. Update it as the source of truth shifts — don't let it go stale.*
