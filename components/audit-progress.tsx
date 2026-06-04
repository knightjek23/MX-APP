"use client";

/**
 * AuditProgress — Dynamic Checklist for the /api/audit run.
 *
 * Per the ai-transparency-patterns skill: a 30-second AI-driven wait
 * needs more than a spinner. This component shows the actual stages of
 * the audit pipeline as a labeled list. Stages reveal one by one as
 * the audit progresses (only completed + active stages are rendered),
 * so the user sees fresh "new work" appearing rather than a static
 * checklist counting down. The active stage's text shimmers (gradient
 * sweep) to reinforce that work is in progress on that step.
 *
 * Stage timings are estimates from PROJECT.md (typical ~29s total):
 *   1. Fetching from Figma:    ~3s
 *   2. Compacting design tree: ~1s
 *   3. Claude scanning:        ~22s
 *   4. Saving:                 ~1.5s (last; held until response lands)
 *
 * If the real request finishes faster, the parent unmounts this
 * component (redirect to /audit/[slug]). If slower, the last stage
 * holds with a spinner until the response lands. Either way, the user
 * sees genuine-feeling progress, not a black box.
 *
 * "Faked" timings are a known-OK first pass per the skill. Real SSE
 * streaming from the route would be a Month 2 follow-up.
 */

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface Stage {
  id: string;
  label: (fileName: string) => string;
  estimatedMs: number;
}

const STAGES: Stage[] = [
  {
    id: "fetching",
    label: (fileName) => `Reading ${fileName} from Figma`,
    estimatedMs: 3000,
  },
  {
    id: "compacting",
    label: () => "Compacting the design tree to fit Claude's context window",
    estimatedMs: 1000,
  },
  {
    id: "scanning",
    label: () => "Claude (Sonnet 4.5) is scanning your design for AX issues",
    estimatedMs: 22000,
  },
  {
    id: "saving",
    label: () => "Saving your audit report",
    estimatedMs: 1500, // last stage holds with spinner until response lands
  },
];

interface Props {
  fileName: string;
}

export function AuditProgress({ fileName }: Props) {
  // currentStage = index of the stage currently in progress.
  // Stages before this index are "done", the one at this index is
  // "active" (spinner), and the ones after are "pending" (dim dot).
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    // Walk through stages 0..N-2, scheduling each transition to the
    // next stage at the cumulative elapsed time. The LAST stage is
    // never auto-completed — it holds until the parent unmounts this
    // component on success or shows an error on failure.
    let elapsed = 0;
    for (let i = 0; i < STAGES.length - 1; i++) {
      elapsed += STAGES[i].estimatedMs;
      const target = i + 1;
      timeouts.push(
        setTimeout(() => {
          setCurrentStage((prev) => Math.max(prev, target));
        }, elapsed)
      );
    }
    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Only render stages we've reached: completed ones + the active one.
  // Pending stages aren't shown until they become active, so the
  // checklist reveals progressively rather than counting down a
  // pre-visible list.
  const visibleStages = STAGES.slice(0, currentStage + 1);

  return (
    <div className="text-center">
      <p className="font-brand text-lg text-legible-text mb-1">
        Running your audit
      </p>
      <p className="text-xs text-legible-text-faded mb-6">
        Free during beta · About 30 seconds
      </p>
      <ul className="space-y-3 text-left">
        {visibleStages.map((stage, index) => {
          const isActive = index === currentStage;
          return (
            <li
              key={stage.id}
              // animate-in/slide-in-from-bottom-2 from tw-animate-css
              // plays once when each new <li> mounts (each stage's key
              // is stable, so existing entries don't re-animate when
              // the array grows).
              className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <span
                className="shrink-0 w-5 h-5 flex items-center justify-center"
                aria-hidden="true"
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin text-legible-orange" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </span>
              <span
                className={`text-sm font-light leading-snug ${
                  isActive
                    ? "legible-shimmer-text"
                    : "text-legible-text-muted"
                }`}
              >
                {stage.label(fileName)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Extract the file name segment from a Figma URL.
 *
 * Figma URLs are shaped like:
 *   https://www.figma.com/design/{fileKey}/{fileName}?node-id=...
 *
 * The fileName segment is URL-encoded and dash-separated. Decoded and
 * de-dashed it's the human-readable name. If the URL doesn't parse,
 * fall back to "your file" so the checklist doesn't show "undefined".
 */
export function extractFigmaFileName(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const designIndex = parts.indexOf("design");
    if (designIndex === -1) return "your file";
    const fileName = parts[designIndex + 2];
    if (!fileName) return "your file";
    return decodeURIComponent(fileName).replace(/-/g, " ");
  } catch {
    return "your file";
  }
}
