---
name: ai-transparency-patterns
description: >-
  Designs honest, trust-building loading and wait states for apps that use AI or
  agents, replacing generic spinners with interface patterns that reveal what the
  system is doing. Picks the right transparency pattern by stakes, writes the status
  microcopy, and gives stack-aware notes. Use whenever an app shows a wait, loading,
  processing, "thinking", or in-progress state driven by an AI/agent step — or the
  user asks to "add a loading state", "design the wait/processing UI", "what should
  the spinner say", "show progress for the agent", "make the AI feel trustworthy",
  "the loading feels broken", "users don't trust the output", "add a thinking
  indicator", "show the AI's steps", or "handle a partial/failed result". Also fires
  when building any feature where an AI does multi-step work the user waits on
  (booking, scheduling, generating, migrating, transferring, analyzing, drafting).
  Err heavily on triggering — any AI-driven wait moment is in scope, even if the
  user just says "spinner" or "loading".
---

# AI Transparency Patterns

## What this skill is for

Spinners were built for a different problem. For thirty years a spinner meant one
thing: "the system is downloading data, the delay is bandwidth." AI agents
introduce a new kind of wait — the system is *thinking*: planning steps, weighing
options, calling tools, generating content. A looping spinner on top of thinking
time reads as "stalled or crashed," and the user can't tell a hard task from a dead
one. That uncertainty is where trust dies.

The job of this skill is to turn each AI wait moment into a moment of reassurance —
from a passive *"something is happening"* to an active *"here is exactly how I'm
working on your problem."* You do that by (1) picking the right container for the
message based on the stakes, and (2) writing status copy that says what the system
is genuinely doing.

Based on Victor Yocco, *Practical Interface Patterns For AI Transparency*
(Smashing Magazine, 2026).

## How to use this skill

When the user is building or reviewing any AI-driven wait state, work through three
steps. Don't dump the whole framework on them — diagnose the moment, then deliver.

1. **Find the AI wait moments.** Look at the app/feature for any point where an AI
   or agent step makes the user wait: generating, booking, scheduling, analyzing,
   migrating, transferring, drafting, searching. Each one is a transparency moment.
2. **Pick a pattern by stakes** using the heuristic below.
3. **Write the status copy** with the Agentic Update Formula, and match the tone to
   the risk. Then give implementation notes for the detected stack.

Default output is design guidance plus the actual microcopy strings (not full
component code). If the user clearly wants code, you can sketch a component, but
lead with the pattern choice and the words — a perfect sentence in a bad container
still fails, and a beautiful container with vague copy fails just as hard.

## The Agentic Update Formula

Retire generic placeholders. *"Loading"* and *"Working"* are remnants of static
software — they tell the user nothing about whether the system understood the
request or is on track. Build every status line from three parts:

**Action Word + Specific Item + Limits/Rules**

- **Action Word** — a concrete verb for what the system is doing right now:
  *Scanning, Checking, Cross-checking, Verifying, Drafting, Syncing, Filtering.*
- **Specific Item** — the actual thing it's working on, grounded in the user's
  real request (names, dates, sources, accounts), not an abstraction.
- **Limits/Rules** — the constraint or boundary it's respecting, which proves it
  understood the ask.

**Example — trip booking:**
Weak: *Searching for flights…*
Strong: *Scanning prices on Lufthansa and United to find anything under $600.*
(Action Word: *Scanning* · Specific Item: *prices on Lufthansa and United* ·
Limits: *under $600*.)

**Example — a multi-step scheduling agent**, broken into separate updates so the
wait reads as progress, not a single mystery pause:

- *Checking your calendar for open times for a recurring Thursday call with Mei and Raj.*
- *Cross-checking availability with Mei's and Raj's calendars.*
- *Syncing schedules to hold your meeting on Thursdays at 10am.*
- *Done — check your email to confirm the invite sent to the group.*

Grounding the technical process in the user's actual life ("whose calendar, which
people, what purpose") is what removes the anxiety. If the user can't tell from the
copy that the system remembered their request, the copy isn't done.

## Match tone to risk

The same formula sounds different depending on what's at stake. Decide tone by
the impact/risk of the task:

- **Low-stakes / low-risk** (drafting an email, sorting files, suggesting a time):
  friendly, conversational. *"Tidying up your inbox — sorting by sender."* This
  keeps the experience easy and human.
- **High-stakes / high-risk** (moving money, migrating a database, anything
  irreversible or expensive): clear, mechanical, precise. A playful *"I'm thinking
  hard about your money"* causes panic. Use *"Verifying account routing numbers."*

The risk matrix is the starting point, not the final word. The real arbiter of
voice and tone is user research — A/B tests on phrasings, usability studies on how
people react emotionally, interviews on what they expect from the AI. No ruleset
predicts the exact words that build trust for a given audience and context, so flag
to the user when a tone choice is worth validating with real users.

## Pick the pattern by stakes

Match the message's weight to the pattern's visibility. A quiet background task
shouldn't get a flashing banner; a high-stakes multi-step process shouldn't hide in
the margin. Use this heuristic, then read
`references/pattern-library.md` for the full spec, anatomy, and microcopy of the
chosen pattern.

| If the moment is… | Use | Why |
| --- | --- | --- |
| **Low-stakes, background** work the user shouldn't be interrupted by (drafting a reply, sorting files, tidying data) | **Living Breadcrumb** | Quiet assurance it's active without demanding attention. |
| **High-stakes, multi-step** work with unpredictable timing (financial transfer, booking travel, data migration) | **Dynamic Checklist** | Shows a plan and exact current position, so a slow step reads as "complex," not "frozen." |
| **Expert / high-transparency** users or complex analysis (code gen, market research) who may distrust a summary | **Thinking Toggle** | Progressive disclosure to sanitized raw logs — "nothing to hide." |
| **Post-task review** of any outcome, especially if the user might walk away mid-run | **Audit Trail** | A persistent receipt so the result can be verified after the fact. |
| The agent **partly succeeded** (most steps worked, some failed) | **Partial Success** design | Avoids a misleading all-or-nothing error; shows what worked and what to fix. |
| The failure was an **external tool/service**, not the AI's reasoning | **Disentangling the Tool** copy | Keeps trust in the AI by naming the real cause and the recovery plan. |

Patterns combine. A high-stakes booking flow often wants a Dynamic Checklist
*during* the run, a Partial Success layout at the *end*, and an Audit Trail the user
can open *later*. Recommend the combination the moment calls for.

## The attention reality (don't skip this)

Real-time transparency is fleeting. Busy professionals — an underwriter running
fifty quotes a day — click "Generate," switch tabs, and judge the system purely by
the final number. They never watch the checklist. If the output matches their
mental estimate ($550 when they expected $500–600), trust builds. If it's off
($900), they stop — but they already missed the real-time explanation of the
high-risk surcharge, and they won't rerun the task to watch the animation again.
Without a persistent record they treat the output as useless and redo it by hand,
which erodes trust further.

The lesson: **never rely on ephemeral, in-the-moment transparency alone for any
output the user might dispute.** Pair live patterns with a persistent **Audit
Trail** so the "why" survives after the progress UI disappears. This is often the
single most important pattern for enterprise tools, where you rarely get a second
chance after a misaligned result.

## Stack-aware implementation notes

Detect the app's stack before suggesting code. Inspect the project (package.json,
file extensions, existing components) and match it; default to **React + Tailwind**
when nothing is found, since that's the common case for these builds. Offer
**vanilla HTML/CSS/JS** when the project is framework-free.

Two implementation realities worth flagging to the user up front, because they
change scope:

- A **Dynamic Checklist** is not a loading flag. It needs front-end state that
  listens for step-completion events, typically fired by a back-end webhook, so the
  UI always reflects the agent's real position. Treat it as a full-stack
  requirement, not a CSS animation.
- A **Thinking Toggle** exposes logs, so the logs **must** be sanitized and
  abstracted before display — strip internal data-structure names, proprietary
  logic, and any tokens. This isn't polish; raw logs can leak exploitable detail.
  Trust must be built through honesty, not a security hole.

## Output template

When you deliver, structure it like this so the user gets a decision, not a lecture:

```
### [Moment name] — e.g. "Generating insurance quote"
Stakes: [low/high + one line of why]
Pattern: [chosen pattern] (+ any companion pattern)
Tone: [conversational / mechanical] and why

Status copy:
- "[Action Word] [Specific Item] [Limits]"
- "[next step…]"
- "[done state]"

[If a result can fail or partially fail, include the Partial Success / tool-failure copy.]

Implementation note: [stack-specific, 1-3 lines — what state/events it needs.]
```

The north star: we're not building magic tricks (misdirection, hidden mechanics).
We're building a colleague — one that keeps you in the loop on what it's doing,
what's taking time, and when it hits a snag. Predictability, reliability, and
understanding *are* the product.
                                                                               