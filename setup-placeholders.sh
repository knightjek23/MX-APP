#!/usr/bin/env bash
# Legible — scaffold placeholder files
# Run this from the root of the `legible` repo AFTER `pnpm create next-app` and `pnpm dlx shadcn init`.
# It creates the folder structure from PROJECT.md §8 with TODO-stubbed files.
# Safe to re-run: uses `-p` for dirs and writes files only if they don't exist yet.

set -euo pipefail

cd "$(dirname "$0")"

# ---- directories ----
mkdir -p app/audit/\[slug\] app/pricing app/auth/figma/callback app/api/audit app/api/health
mkdir -p lib/services lib/prompts lib/types lib/db lib/rate-limit lib/validation lib/logger
mkdir -p components/ui
mkdir -p __tests__/services __tests__/validation
mkdir -p e2e
mkdir -p .github/workflows

# ---- helper: write file only if it doesn't exist ----
write_if_missing() {
  local path="$1"
  local content="$2"
  if [ ! -f "$path" ]; then
    printf '%s\n' "$content" > "$path"
    echo "  created  $path"
  else
    echo "  skipped  $path (exists)"
  fi
}

echo "Creating placeholder files..."

# ---- lib/services ----
write_if_missing "lib/services/figma.ts" "// TODO (Prompt 3): FigmaService per PROJECT.md §3.
// Constructor takes a token (PAT or OAuth — interchangeable).
// fetchFile(fileId, nodeId?) returns FigmaTree. Throws InvalidTokenError,
// FileNotFoundError, FigmaApiError. NEVER logs the token.
export {};"

write_if_missing "lib/services/claude.ts" "// TODO (Prompt 3): ClaudeService per PROJECT.md §3.2 (tool-use pattern).
// Registers AuditResultSchema as submit_audit tool input_schema.
// Forces tool_choice to submit_audit. Extracts tool_use block, zod-validates.
// Returns AuditResult + metrics (tokens_input, tokens_output, latency_ms, cost_usd, tokens_compacted).
export {};"

write_if_missing "lib/services/audit.ts" "// TODO (Prompt 3): AuditService per PROJECT.md §3.
// persist(record) → slug (nanoid(10)). fetch(slug) → AuditRecord | null.
export {};"

# ---- lib root ----
write_if_missing "lib/compact.ts" "// TODO (Prompt 3): Pure function compactTree(raw) per PROJECT.md §3.1.
// Apply keep/strip rules. Flatten single-child groups. Dedupe repeated component instances.
// Truncate text >500 chars. Target 70% token reduction.
export {};"

write_if_missing "lib/scoring.ts" "// TODO (Prompt 2): Log-curve score formula per PROJECT.md §4.
// export function computeScore(p1: number, p2: number, p3: number): number {
//   const p1Penalty = Math.ceil(Math.log2(p1 + 1) * 12);
//   return Math.max(0, 100 - p1Penalty - p2 * 3 - p3 * 1);
// }
export {};"

# ---- lib/prompts ----
write_if_missing "lib/prompts/mx-auditor.ts" "// TODO (Prompt 2): Export v1 system prompt from PROJECT.md §2 as MX_AUDITOR_PROMPT const.
export const MX_AUDITOR_PROMPT = \`\`;"

# ---- lib/types ----
write_if_missing "lib/types/audit.ts" "// TODO (Prompt 2): Zod schemas from PROJECT.md §4.
// Export: PrioritySchema, CategorySchema, AnnotationSchema, FrameAuditSchema,
// EntityConflictSchema, AuditSummarySchema, AuditResultSchema + inferred types.
export {};"

write_if_missing "lib/types/figma.ts" "// TODO (Prompt 2): Minimal Figma API types per PROJECT.md §8.
// Source from https://www.figma.com/developers/api — only what we need (File, Node, Document).
export {};"

# ---- lib/db ----
write_if_missing "lib/db/supabase.ts" "// TODO (Prompt 4): Server-side Supabase client factory using SERVICE_ROLE_KEY.
export {};"

# ---- lib/rate-limit ----
write_if_missing "lib/rate-limit/index.ts" "// TODO (Prompt 4): Upstash Ratelimit wrapper.
// 5 requests per 1 hour, sliding window, keyed by SHA-256 hashed IP.
export {};"

# ---- lib/validation ----
write_if_missing "lib/validation/figma-url.ts" "// TODO (Prompt 2): Parse a Figma URL into { fileId, nodeId? }.
// Handle both /file/ and /design/ formats. Throw on malformed input with a user-readable error.
export {};"

# ---- lib/logger ----
write_if_missing "lib/logger/index.ts" "// TODO (Prompt 3): Structured logger.
// Redact anything matching figd_[A-Za-z0-9_-]+ (Figma PAT) and /Bearer .+/ (OAuth).
export {};"

# ---- components ----
write_if_missing "components/audit-form.tsx" "// TODO (Prompt 5): Landing page form (client). React Hook Form + Zod.
// Disable submit during pending. Error toast on failure. Redirect to /audit/[slug] on success.
export {};"

write_if_missing "components/audit-report.tsx" "// TODO (Prompt 5): Report root (server component).
// Takes AuditResult, renders header + summary + chips + annotation list + footer actions.
// Shows scope badge ('Full file' / 'Single frame').
export {};"

write_if_missing "components/annotation-card.tsx" "// TODO (Prompt 5): Single annotation. Collapsible code block. Copy-to-clipboard.
export {};"

write_if_missing "components/summary-grid.tsx" "// TODO (Prompt 5): 4-card grid (P1 / P2 / P3 / entity) with semantic colors.
export {};"

write_if_missing "components/entity-conflicts-card.tsx" "// TODO (Prompt 5): Handles full-file state AND single-frame greyed state.
// Upsell CTA that pre-fills the landing form with the file URL (no node_id).
export {};"

write_if_missing "components/filter-chips.tsx" "// TODO (Prompt 5): Client component, controlled filter state.
// Clicking a chip filters the annotation list.
export {};"

write_if_missing "components/score-badge.tsx" "// TODO (Prompt 5): Color-coded score display (90+ success, 70+ warning, <70 danger).
export {};"

# ---- app routes ----
write_if_missing "app/api/audit/route.ts" "// TODO (Prompt 4): POST handler per PROJECT.md §9 Prompt 4.
export {};"

write_if_missing "app/api/health/route.ts" "// TODO (Prompt 4): GET handler. Returns { sha, figma, claude, supabase }.
export {};"

write_if_missing "app/audit/[slug]/page.tsx" "// TODO (Prompt 5): Server component. Fetches audit from AuditService.
// Renders AuditReport. 404 if not found.
export {};"

write_if_missing "app/pricing/page.tsx" "// TODO (Prompt 5): Stub — 'Coming soon. Beta is free.'
export default function Pricing() {
  return null;
}"

write_if_missing "app/auth/figma/callback/route.ts" "// TODO (Prompt 7 / Week 1.5): OAuth exchange.
// Exchange code for access token. Store in httpOnly session cookie (1hr). Redirect to /.
export {};"

# ---- tests ----
write_if_missing "__tests__/services/figma.test.ts" "// TODO (Prompt 3): Mock Figma API, test happy path + each error class.
export {};"

write_if_missing "__tests__/services/claude.test.ts" "// TODO (Prompt 3): Mock Anthropic, test tool-use happy path + ClaudeNoToolUseError.
export {};"

write_if_missing "__tests__/services/audit.test.ts" "// TODO (Prompt 3): Test persist + fetch against Supabase test client.
export {};"

write_if_missing "__tests__/validation/figma-url.test.ts" "// TODO (Prompt 2): 5+ cases — valid file URL, valid design URL, URL with node-id,
// invalid host, malformed path.
export {};"

write_if_missing "__tests__/compact.test.ts" "// TODO (Prompt 3): Verify compaction reduces a sample raw tree by 60%+
// while preserving all names, types, text content, and hierarchy.
export {};"

write_if_missing "__tests__/scoring.test.ts" "// TODO (Prompt 2): Verify scores at key counts:
// (0,0,0)=100, (1,0,0)=88, (6,4,3)=~51, (40,0,0)>0, (100,0,0)>0.
export {};"

# ---- e2e ----
write_if_missing "e2e/happy-path.spec.ts" "// TODO (Prompt 4): Playwright E2E —
// valid submit → report URL, invalid URL → error, expired PAT → error,
// oversized file → scope-to-frame copy.
export {};"

# ---- CI ----
write_if_missing ".github/workflows/ci.yml" "# TODO (Prompt 6): On PR — pnpm install, lint, typecheck, vitest, build.
name: CI
on:
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: echo 'placeholder — fill in per PROJECT.md §9 Prompt 6'"

echo ""
echo "Done. Next: fill in env vars in .env.local, then paste Prompt 2 into Claude Code."
