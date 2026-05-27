# Spec: Copy for Figma button

**Status:** Draft
**Author:** Josh (with Claude)
**Date:** 2026-05-23
**Scope:** ~60 minutes of work, one new helper + button + log event
**Hypothesis owner:** This is the cheap proxy that decides whether the full Figma plugin gets built as Month 2 work.

## Problem

Designers see audit recommendations on legible.design (web). To act on a recommendation, they have to flip to Figma, find the right layer, and re-type or summarize the rec as a comment. That friction means most recommendations never make it into the file where the designer actually works.

## Why this matters now

It's the cheap proxy that tests the riskiest assumption behind the full Figma plugin: **do designers want audit content inside Figma at all?**

- If they copy-paste often, the plugin is validated and worth the Month 2 build.
- If they don't, we save 1 to 2 weeks of build and pivot.

This ships before the 20-designer beta outreach so we get both the click data and the qualitative responses on the same cohort.

## Who it's for

Signed-in designer who just ran an audit, has the report open in one tab and the Figma file open in another, and wants to leave a teammate (or future-self) a comment on the relevant layer.

## Solution sketch

Add a small `Copy for Figma` button to every `AnnotationCard`, next to the existing copy-code interaction in engineer view, and as a single primary action in design view. Click writes a formatted, paste-ready comment string to the clipboard. Button flips to a check icon + `Copied` for 1.5 seconds (matches existing pattern in `components/annotation-card.tsx`).

## Format of the copied string

### Design view (paste into Figma comment on a frame layer)

```
[P1 · Page structure]
Mark this frame as your page's primary content region. Add a 'Main content' label in your design system or annotate the frame in your dev handoff notes.

Why this matters: AI agents look for a clearly-identified main content region the way humans look for a hero. Without that mark, your design reads as one undifferentiated block and the agent gives up.

via Legible · legible.design/audit/[slug]
```

### Engineer view (same shape, adds code hint)

```
[P1 · ARIA]
Wrap the entire frame in a <main> landmark element so agents can identify and navigate to it directly.

Why this matters: Agents locate primary content via the <main> landmark. Without it, they fall back to vision-only parsing and task success drops to the ~28% range.

Markup:
<main>...page content...</main>

via Legible · legible.design/audit/[slug]
```

## Functional requirements

1. Button renders on every `AnnotationCard` in both views.
2. Click writes a formatted string to `navigator.clipboard` (handle permission failure silently, matching existing copy-code behavior).
3. Visual confirmation: button label flips to `Copied` with a check icon for 1.5 seconds.
4. Format includes priority badge, category label, recommendation, rationale, code hint (engineer view only), and attribution line with the audit URL.
5. Logs one analytics event per click: `audit.annotation.copy_for_figma` with `{ slug, view, priority, category }`.

## Acceptance criteria

**Given** an engineer-view annotation, **when** I click `Copy for Figma`, **then** my clipboard contains the formatted string with priority, recommendation, rationale, code hint, and the audit URL.

**Given** a design-view annotation, **when** I click `Copy for Figma`, **then** my clipboard contains the design recommendation, rationale, and audit URL, with no code section.

**Given** any annotation, **when** I click `Copy for Figma`, **then** the button shows a check + `Copied` state for 1.5 seconds before reverting.

**Given** a legacy audit missing design copy, **when** I click `Copy for Figma` in design view, **then** I get the engineer copy with the existing fallback (no failure, no empty output).

## Non-goals

- Auto-pushing into Figma. That's the Month 2 plugin if this validates.
- Opening Figma directly with the layer pre-selected.
- Bulk-copying all annotations at once. One at a time, designers triage which to action.
- Format variants for Slack, Jira, or email. Figma comment shape only.

## Risks and open questions

- **Risk:** clipboard write fails silently in some browser permission configurations. Existing pattern in `annotation-card.tsx` already handles this gracefully.
- **Open question:** include the Figma file URL or node-id deep link in the copied string? Including it makes paste location obvious but adds clutter. **Recommendation:** leave it out for v1 — designers paste into the Figma comment that's already on the right layer.
- **Open question:** label text. Considered `Copy as comment`, `Copy to clipboard`, `Copy for Figma`. **Recommendation:** `Copy for Figma` — the explicit pairing primes the paste action.

## Hypothesis

> We believe that adding a `Copy for Figma` button to each annotation will result in **20% or more of audits having at least one click within 4 weeks**, measured via the `audit.annotation.copy_for_figma` log event among designers who completed at least one audit.

**Pre-committed thresholds:**

| Click rate | Action |
| --- | --- |
| Below 10% | Abandon the Figma plugin path. Recommendations live on web only. |
| 10% to 20% | Keep the button. Defer the plugin decision until the beta cohort grows. |
| Above 20% | Green-light the full Figma plugin as Month 2 work, using the copied-string format as the starting point for the plugin's annotation shape. |

## Implementation notes

- New helper: `lib/format/figma-comment.ts` exporting `buildFigmaCommentText(annotation, audit, view): string`.
- Reuse the existing copy-state pattern in `components/annotation-card.tsx` (the `copied` state machine and `setTimeout(() => setCopied(false), 1500)` lines).
- Use the existing logger; emit `logger.info("audit.annotation.copy_for_figma", { slug, view, priority, category })`.
- Tests: one unit test per view template proving the output matches the format spec, plus one fallback test for legacy-audit design view.

## Effort estimate

About 60 minutes total.

- 15 min: write `buildFigmaCommentText` + unit tests
- 20 min: add button to `AnnotationCard` for both views
- 10 min: wire up the log event
- 15 min: manual verification in dev, then push to main

## Links

- Beta outreach instrument that uses this feature's data: [2026-05-23-beta-outreach.md](./2026-05-23-beta-outreach.md). H2 (annotation copy rate) is instrumented by this spec; Q2 (Figma plugin probe) is asked in that spec.
- Related to: full Figma plugin spec (TBD if validated)
- Decision predecessor: 2026-04-27-accounts-mvp-design.md
- Single source of truth: PROJECT.md §7
