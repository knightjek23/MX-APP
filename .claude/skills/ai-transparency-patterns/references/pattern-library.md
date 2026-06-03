# Pattern Library

Detailed specs for each transparency pattern. SKILL.md picks the pattern by stakes;
this file gives the anatomy, microcopy, and implementation notes for whichever one
you chose. Read only the section you need.

Contents:

1. The Living Breadcrumb — low-stakes background work
2. The Dynamic Checklist — high-stakes, multi-step work
3. The Thinking Toggle — expert / deep-transparency users
4. Designing for Partial Success — mostly-succeeded outcomes
5. Disentangling the Tool — failures caused by external services
6. The Audit Trail — persistent, after-the-fact verification

---

## 1. The Living Breadcrumb

**Best for:** low-stakes work the AI is doing quietly in the background — drafting a
reply, sorting files, tidying data. The user shouldn't be interrupted, but should be
able to glance and confirm it's alive.

**The anxiety it answers:** "Did the system stall or freeze?"
**The trust signal:** "I'm active, but I won't disturb you."

**Anatomy.** A small, subtle indicator living in the app's border, menu area, or a
status strip — not a modal, not a pop-up. It is *not* a static icon. It smoothly
transitions between short text updates so a passing glance shows real movement:

- *Reading email* → *Drafting reply* → *Checking tone*

Each label still follows the Agentic Update Formula where space allows; in a tight
breadcrumb you can drop the Limits clause and keep Action Word + Specific Item.

**Microcopy examples**

- Email assistant: *Reading the thread* → *Drafting your reply* → *Checking tone*
- File organizer: *Scanning Downloads* → *Grouping by project* → *Renaming 12 files*
- Notes app: *Summarizing the meeting* → *Pulling out action items*

**Implementation notes.** Drive it from the agent's step events; animate the
text swap (cross-fade or slide) so it reads as living rather than flickering. Keep
it dismissible/ignorable — it must never steal focus or block interaction. A subtle
pulse on the container communicates "working" without a spinner's "stuck" feeling.

---

## 2. The Dynamic Checklist

**Best for:** high-stakes, multi-step workflows with unpredictable per-step timing —
financial transfers, travel booking, data migration. The user needs to see the plan
and exactly where the system is in it.

**The anxiety it answers:** "Is it stuck? What step is taking so long?"
**The trust signal:** "I have a plan, and I'm currently executing step 2."

**Anatomy.** Lay out every planned step up front. Mark completed steps done, the
current step in progress, and future steps pending. The whole plan is visible the
entire time — that's the advantage over a progress bar.

```
Step 1: Verify account balance      [Complete]
Step 2: Convert currency            [Processing]
Step 3: Transfer funds              [Pending]
```

**Why it beats a progress bar.** It manages unpredictable time. If currency
conversion suddenly takes ten extra seconds, the user feels no spike of panic —
they can see the delay is in the *Converting Currency* step, recognize that step as
inherently complex, and stay patient. A stalled progress bar gives them none of
that context.

**Microcopy examples** (step labels still use the formula)

- *Verifying account routing numbers* → *Converting USD to EUR at today's rate* →
  *Transferring €2,400 to the saved recipient*
- *Confirming traveler details* → *Booking UA 492 (under $600)* →
  *Reserving Marriott Downtown for 2 nights* → *Adding Hertz rental*

**Implementation notes (flag as full-stack).** This is not a loading flag. It needs
front-end state management that listens for step-completion events, typically fired
by a back-end webhook, so the UI always reflects the agent's real-time position.
Budget for that wiring — designers and engineers should scope it as a real feature.

---

## 3. The Thinking Toggle

**Best for:** expert tools and complex analysis (code generation, market research)
where some users have high transparency needs and won't trust a friendly summary —
they want to see the raw processing.

**The anxiety it answers:** "Is this hallucinating or using real data?"
**The trust signal:** "I have nothing to hide — here are my raw logs."

**Anatomy.** A progressive-disclosure control — a chevron or a "View logs" /
"Show thinking" button — that expands the friendly status into a sanitized terminal
view of the agent's logic:

```
Querying API endpoint /v2/search
Response received: 200 OK
Filtering results by relevance score > 0.8
```

Most users never open it. Its *presence* is the trust signal: it tells the deep-
transparency user the system isn't concealing anything.

**Critical safety rule.** Sanitize and abstract the logs before display, even for
expert audiences. Strip proprietary business logic, internal data-structure and
table names, and any security tokens. Raw, unsanitized logs can expose exploitable
detail — the toggle must build trust through honesty, not open a hole. Treat
sanitization as non-negotiable, not optional polish.

**Implementation notes.** Keep the collapsed (friendly) and expanded (log) states in
sync with the same underlying event stream. Default to collapsed. Make the log
read-only and scrollable.

---

## 4. Designing for Partial Success

**Best for:** any agent outcome that can land in the grey zone — most of the task
worked, a piece didn't. Agents rarely fail cleanly; an agent can plan a whole trip
and only miss one restaurant booking.

**Why it matters.** A binary "Request Failed" banner after a 90%-successful run is a
trust-killer — it's misleading and makes the user think the work is gone. Show what
worked and what didn't, line by line, so the user only has to fix the failed part
and keeps everything the agent already accomplished.

**Anatomy / microcopy**

```
Flight booked: UA 492            [Success]
Hotel reserved: Marriott Downtown [Success]
Car rental: Hertz                 [Failed — no inventory]
```

Pair each failed line with a clear next action ("Book a car yourself" / "Retry with
a different vendor") so the user knows exactly where to step in. Never collapse a
mixed result into a single red error.

**Implementation notes.** Model each sub-task's status independently
(success / failed / skipped) rather than a single overall boolean. The UI renders
per-item state and surfaces a targeted recovery action only on the failed items.

---

## 5. Disentangling the Tool

**Best for:** failures that are actually caused by an external service or tool the
AI depends on, not by the AI's own reasoning. Users wrongly blame the AI for a
down API, which erodes trust in a capable system.

**The principle.** Name the real cause and the recovery plan. Keep the AI's
competence intact while being honest about what broke.

**Microcopy**

- Less helpful (makes the AI look incompetent):
  *"I could not check your calendar."*
- More helpful and honest:
  *"The Google Calendar connection isn't responding. I'll automatically try again
  in 30 seconds."*

The second version tells the user the AI is capable but a tool outside its control
failed — and that there's a recovery in motion. That distinction keeps faith in the
AI even when things go wrong.

**Implementation notes.** Distinguish error sources in your error handling
(reasoning error vs. tool/integration error vs. timeout) and template the copy by
source. Include the service name, and an automatic-retry or manual-retry affordance
where possible.

---

## 6. The Audit Trail

**Best for:** post-task review of *any* outcome — final reports, completed bookings,
generated quotes — and essential whenever the user might walk away mid-run and
return to a finished screen.

**The anxiety it answers:** "How do I know this result is accurate?"
**The trust signal:** "Here's the receipt of my work for you to verify."

**Why it's often the most important pattern.** Real-time transparency is fleeting.
If the user tabbed away, they missed the Dynamic Checklist and the live explanation
of, say, a high-risk surcharge. If that explanation vanished with the progress bar,
a surprising result ($900 when they expected $550) becomes unverifiable — and they
redo the work by hand, treating the AI as useless. A persistent record prevents the
AI from *creating* more work. In enterprise tools you rarely get a second chance
after a misaligned result, so this is frequently the highest-value pattern.

**Anatomy.** A "Show work" interaction on the final result screen — a link or
history log that lets the user replay the decision logic after the fact:

- *See how this price was calculated*
- *View search sources*
- *Here's what I remembered about you, and when I used it*

The receipt is the safety net. Even users who never click it trust the system more
because the receipt exists — it signals the system stands behind its work.

**Cautionary example (ChatGPT memory, 2025).** ChatGPT's memory silently fed prior
context into every new conversation with no visible log, timeline, or plain-language
list of "here's what the AI has decided about you." A user noticed it had inserted a
"Half Moon Bay" sign into a generated image by cross-referencing their location from
past chats — personalization with no way to audit it. The fix is exactly this
pattern: make memory and decision history visible and reviewable, not a hidden
dossier. Personalization without auditability erodes trust; provide both.

**Implementation notes.** Persist the decision log / sources / inputs with the
result, not just in transient UI state. Provide a stable link from the result to its
audit view. For memory specifically, give users a plain-language, browsable list of
what's stored and when it was used.

---

## Quick reference: the four core containers

| Pattern | Best use case | The user's anxiety | The trust signal |
| --- | --- | --- | --- |
| Living Breadcrumb | Low-stakes background tasks (drafting emails, sorting files) | Did the system stall or freeze? | I'm active, but I won't disturb you. |
| Dynamic Checklist | High-stakes workflows with variable timing (transfers, booking travel) | Is it stuck? What step is taking so long? | I have a plan, and I'm executing step 2. |
| Thinking Toggle | Expert tools / complex analysis (code gen, market research) | Is this hallucinating or using real data? | I have nothing to hide; here are my raw logs. |
| Audit Trail | Post-task review for any outcome (reports, completed bookings) | How do I know this result is accurate? | Here's the receipt of my work for you to verify. |

Partial Success and Disentangling the Tool are layered on top of these as the
outcome/error-handling layer — use them alongside whichever container fits the run.
