/**
 * AuditReport — the `/audit/[slug]` page root.
 * Server component. Composes header + summary grid + annotation section
 * + footer actions. Client interactivity (filters, copy button) lives
 * inside child components.
 *
 * When `viewerUserId` matches `audit.user_id` (the audit's creator), a
 * subtle "Yours" pill appears in the metadata row and a "Re-run this
 * file" footer action is added — owner gets a one-click way to refresh
 * the audit without retyping the URL.
 */

import { ExternalLink, RefreshCw, RotateCw } from "lucide-react";
import { ScoreBadge } from "./score-badge";
import { SummaryGrid } from "./summary-grid";
import { EntityConflictsCard } from "./entity-conflicts-card";
import { AnnotationsSection } from "./annotations-section";
import type { StoredAudit } from "@/lib/services/audit";

interface Props {
  audit: StoredAudit;
  viewerUserId?: string | null;
}

export function AuditReport({ audit, viewerUserId }: Props) {
  const {
    audit_json,
    figma_url,
    figma_file_id,
    run_at_utc,
    model,
    scope,
    latency_ms,
  } = audit;
  const latencySeconds = Math.round(latency_ms / 100) / 10;

  const frameName = audit_json.frames[0]?.name ?? "Unnamed frame";
  const scopeLabel = scope === "full-file" ? "Full file" : "Single frame";
  const isOwner = !!viewerUserId && viewerUserId === audit.user_id;

  // For "Re-run this file": strip ?node-id and ?t params so the form on /
  // doesn't auto-scope to the same node — let the user choose.
  const rerunUrl = stripFigmaQueryParams(figma_url);
  const rerunHref = `/?figma_url=${encodeURIComponent(rerunUrl)}`;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header row */}
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              AX audit
            </div>
            <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {frameName}
            </h1>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 flex items-center gap-3 flex-wrap">
              <span>{figma_file_id}</span>
              <span>·</span>
              <span>{formatDate(run_at_utc)}</span>
              <span>·</span>
              <span>{model}</span>
              <span>·</span>
              <span>{latencySeconds}s</span>
              <span>·</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">
                {scopeLabel}
              </span>
              {isOwner && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
                    Yours
                  </span>
                </>
              )}
            </div>
          </div>
          <ScoreBadge score={audit_json.summary.overall_score} />
        </header>

        {/* Summary grid — 3 priority cards + entity conflicts card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryGrid summary={audit_json.summary} />
          <EntityConflictsCard
            scope={scope}
            conflictCount={audit_json.entity_conflicts.length}
            figmaUrl={figma_url}
          />
        </div>

        {/* Annotations with filter chips */}
        <AnnotationsSection frames={audit_json.frames} />

        {/* Footer actions */}
        <footer className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 flex-wrap">
          <a
            href={figma_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Figma
          </a>
          {isOwner && (
            <a
              href={rerunHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Re-run this file
            </a>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Run another audit
          </a>
        </footer>
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Strip the volatile query params Figma adds to share URLs (`node-id`
 * for scoped links, `t` for cache-busting). Returns the bare file URL
 * suitable for pre-filling the audit form on /.
 */
function stripFigmaQueryParams(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("node-id");
    u.searchParams.delete("t");
    return u.toString();
  } catch {
    return url;
  }
}
