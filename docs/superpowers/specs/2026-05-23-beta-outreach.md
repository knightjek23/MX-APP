# Spec: Beta outreach (20-designer cohort)

**Status:** Draft
**Author:** Josh (with Claude)
**Date:** 2026-05-23
**Owner:** Josh
**Companion spec:** [2026-05-23-copy-for-figma.md](./2026-05-23-copy-for-figma.md)

## Goal

Validate that Legible's audit lands with cold designers, and capture the signal that decides the next two build decisions: the Figma plugin (Month 2) and platform expansion / audit-by-URL (Month 2 or 3).

Two-week post-ship gate. Per PROJECT.md success criteria: 5+ designers unprompted say "this is useful," 1+ asks "how much?" unprompted, 0 critical bugs.

## Hypotheses being tested

| # | Hypothesis | Falsified if |
| --- | --- | --- |
| H1 | Cold designers run the audit at least once after landing on the site | Less than 50% of outreach recipients complete one audit |
| H2 | At least one rec from the audit makes it into the designer's Figma file | Less than 20% of audits show a `audit.annotation.copy_for_figma` click within 4 weeks |
| H3 | Designers want recommendations pushed into Figma automatically | Fewer than 5/20 say yes to the Figma plugin probe |
| H4 | Designers ship past Figma and care about post-publish AX | Fewer than 5/20 say they currently audit (or wish they audited) the published site |

## Cohort

- **Size:** 20 designers
- **Sourcing:** TBD by Josh. Mix of (a) Figma-only practitioners and (b) designers who also ship Webflow / Framer / custom code. Aim for at least 5 in each bucket so platform-expansion signal (H4) is interpretable.
- **Channel:** TBD. Likely DM on LinkedIn + Twitter, possibly Figma community Slack/Discord groups.

## Outreach sequence

### Day 0: initial reach-out

Cold email/DM template — TBD. Should:

- Lead with the stakes (51% of traffic is non-human, your designs are invisible to AI agents)
- Offer the free audit as the hook (no sign-up friction needed beyond Clerk)
- Be ≤4 sentences. Cold-message rules apply.

### Day +2 after first audit: discovery questions

Sent as a single follow-up message after the designer's first audit completes. Three questions, deliberately ordered so the JTBD answer isn't anchored by the feature/platform probes.

#### Q1: JTBD switch question

> After you ran the audit, what was your next move? Walk me through what you did with the recommendations.

This surfaces actual workflow, not stated preference. Signal interpretation:

- *"I read them and closed the tab."* — low intent. Audit isn't sticking. Investigate why.
- *"I sent the link to my dev."* — handoff job. Audit is a translation artifact.
- *"I went back to Figma and tried to find the layers."* — strong Figma-plugin signal.
- *"I screenshotted the recs as sticky notes in my Figma file."* — strongest plugin signal. They're already doing the manual version.

#### Q2: Figma plugin feature probe

> If Legible could push the recommendations into Figma as Dev Mode annotations on the right layers automatically, would that change how you'd use it? What would make you skeptical?

The "what would make you skeptical" half is the playbook move. Designers nod-yes to features they'd never use. Inviting pushback surfaces real friction.

Signal interpretation:

- *"I don't use Dev Mode."* — market sizing problem. May need to support regular comments instead.
- *"My team comments on Figma frames, not on layers."* — format spec input. Plugin should target frames by default.
- *"I'd want to choose which recs to push, not all of them."* — MVP spec input. Selective push, not bulk.
- *"Yes, that would be huge."* — green light, build it.

#### Q3: Platform / positioning probe

> Where does your design go after Figma? When you ship a site on Webflow, Framer, or custom code, who or what audits it for AI agents currently?

This surfaces three things at once: which platforms the cohort actually uses, whether anyone audits post-publish today, and whether Legible should follow the design past the Figma file. Pure signal, zero build cost.

Signal interpretation:

- *"Nothing audits it. I just publish."* — strong audit-by-URL signal. Build Phase 2.
- *"I run Lighthouse / WAVE / axe."* — a11y tools cover some AX but not all. Position Legible as the gap-filler.
- *"My dev handles that."* — handoff job, again. Different positioning.
- *"I only design in Figma, I don't ship."* — audit-by-URL doesn't apply. Keep them in the Figma cohort.

### Day +7: final feedback ask

> Would you keep using Legible if it cost $5 for a pack of 10 audits? What would make it worth $20 instead?

Pricing probe. Tests price sensitivity and unlocks the implicit "what would make this 4x more valuable" question. Captures the language designers use to describe high-value features so we can use it in marketing copy.

## Analysis plan

After 4 weeks (or when 15/20 have completed at least one audit, whichever comes first), tally:

1. **H1 — completion rate.** Count audits run per designer.
2. **H2 — click rate.** Aggregate the `audit.annotation.copy_for_figma` log events.
3. **H3 — Figma plugin signal.** Count "yes" / "skeptical" / "no" responses on Q2.
4. **H4 — platform signal.** Count "nothing audits it" / "axe-style tools" / "doesn't apply" on Q3.

### Decision tree (pre-committed)

| Outcome | Next build |
| --- | --- |
| H1 below 50% | Pause new features. Investigate why the audit isn't landing. Could be onboarding, copy, trust, or the audit itself. |
| H1 above 50%, H3 above 5/20 yes | Build the Figma plugin as Month 2 work. |
| H1 above 50%, H4 above 5/20 "nothing audits it" | Build audit-by-URL as Month 2 or 3 work. |
| Both H3 and H4 land | Decide which based on which signal is stronger AND which platform the cohort uses most. Don't try to do both in parallel. |
| Pricing probe gets multiple "yes I'd pay" responses | Wire up Stripe and start charging. |

## Non-goals

- Statistical rigor. n=20 is qualitative signal, not significance. Treat as directional.
- Multi-touch outreach beyond Day 0 → +2 → +7. We're not running a drip campaign.
- Anything past the 4-week window. If signal hasn't landed by then, the design changes, not the messaging.

## Risks and open questions

- **Risk:** designers don't respond to follow-ups at all. **Mitigation:** keep follow-ups very short (one question, easy to reply to) and time them when the audit is fresh.
- **Open question:** should we offer cash incentives ($10 Amazon gift card per completed survey)? Pro: response rate. Con: skews sample toward people who'll do anything for $10. **Recommendation:** no incentive for v1; revisit if response rate drops below 30%.
- **Open question:** should we ship "Copy for Figma" before outreach, or after? **Recommendation:** ship it before, so H2 has data to measure against.

## Links

- Companion: [2026-05-23-copy-for-figma.md](./2026-05-23-copy-for-figma.md) — the cheap proxy that gives H2 its instrumentation
- Predecessor: PROJECT.md §10 success gate definition
