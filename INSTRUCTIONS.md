# Prompt 2 — drop-in bundle

This folder mirrors the file structure inside your `legible/` repo. Drag the contents into your repo root.

## Step 1 — copy the files in

From this folder, copy these into your `legible/` directory, preserving paths:

- `vitest.config.ts` → `legible/vitest.config.ts`
- `lib/types/audit.ts` → `legible/lib/types/audit.ts`
- `lib/types/figma.ts` → `legible/lib/types/figma.ts`
- `lib/prompts/mx-auditor.ts` → `legible/lib/prompts/mx-auditor.ts`
- `lib/scoring.ts` → `legible/lib/scoring.ts`
- `lib/validation/figma-url.ts` → `legible/lib/validation/figma-url.ts`
- `__tests__/scoring.test.ts` → `legible/__tests__/scoring.test.ts`
- `__tests__/validation/figma-url.test.ts` → `legible/__tests__/validation/figma-url.test.ts`

Easiest way: open File Explorer, drag the four top-level items (`vitest.config.ts`, `lib/`, `__tests__/`) into your `legible/` folder and choose "merge" when Windows asks.

## Step 2 — update `package.json` scripts

Open `legible/package.json`. Find the `"scripts"` block (near the top). Add these three lines into it:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

Your scripts block should end up looking roughly like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

Commas matter — each line except the last inside the block needs a trailing comma.

## Step 3 — run the tests

From inside `legible/` in your terminal:

```bash
pnpm test
```

You should see something like:

```
 ✓ __tests__/scoring.test.ts  (11 tests)
 ✓ __tests__/validation/figma-url.test.ts  (12 tests)

 Test Files  2 passed (2)
      Tests  23 passed (23)
```

Also run the typecheck:

```bash
pnpm typecheck
```

Should complete with no errors.

## Step 4 — commit

```bash
git add .
git commit -m "types + prompt + scoring + url validation"
git push
```

## What this gives you

- **`lib/types/audit.ts`** — Zod schemas for the audit result. This is the contract between Claude and the UI. Also used as the `input_schema` for the `submit_audit` tool in Prompt 3.
- **`lib/types/figma.ts`** — minimal Figma API types so the service layer (Prompt 3) has something to consume.
- **`lib/prompts/mx-auditor.ts`** — the v1 system prompt as a typed const.
- **`lib/scoring.ts`** — the log-curve score formula. Server re-runs this against LLM output as a sanity check.
- **`lib/validation/figma-url.ts`** — URL parser that handles both `/file/` and `/design/` formats, both node ID formats, and produces user-readable errors.
- **Two test suites** — 23 tests total covering scoring edge cases and URL parsing variants.

## What's next

Prompt 3 — the service layer. FigmaService for the API, ClaudeService with tool-use structured output, AuditService for Supabase persistence, plus the compaction function. That one needs your Anthropic key and Supabase URL to run end-to-end, so make sure those are in `.env.local` before we start.
