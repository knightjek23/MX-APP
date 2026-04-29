/**
 * EntityConflictsCard — handles both states per PROJECT.md §7:
 * - Full-file audit: shows conflict count, active.
 * - Single-frame audit: greyed out with upsell CTA linking back to
 *   the landing page with the file URL pre-populated (no node_id).
 */

import Link from "next/link";

interface Props {
  scope: "full-file" | "single-frame";
  conflictCount: number;
  figmaUrl: string;
}

export function EntityConflictsCard({ scope, conflictCount, figmaUrl }: Props) {
  if (scope === "full-file") {
    return (
      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-xl px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Entity conflicts
          </span>
        </div>
        <div className="text-2xl font-medium mt-1 text-neutral-900 dark:text-neutral-100">
          {conflictCount}
        </div>
      </div>
    );
  }

  // Strip any ?node-id=... from the URL so the re-run scopes to full file.
  const rerunUrl = stripNodeId(figmaUrl);
  const prefilledUrl = `/?figma_url=${encodeURIComponent(rerunUrl)}`;

  return (
    <Link
      href={prefilledUrl}
      className="block bg-neutral-100/50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors group"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
          Entity conflicts
        </span>
      </div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
        Audit a full file to detect inconsistent naming across frames.{" "}
        <span className="text-neutral-900 dark:text-neutral-200 underline underline-offset-2 group-hover:no-underline">
          Re-run full file →
        </span>
      </div>
    </Link>
  );
}

function stripNodeId(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("node-id");
    u.searchParams.delete("t");
    return u.toString();
  } catch {
    return url;
  }
}
