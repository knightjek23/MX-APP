/**
 * AuditReport — the `/audit/[slug]` page root.
 * Server component. Composes header + summary grid + annotation section
 * + footer actions. Client interactivity (filters, copy button) lives
 * inside child components.
 */

import { ExternalLink, RefreshCw } from "lucide-react";
import { ScoreBadge } from "./score-badge";
import { SummaryGrid } from "./summary-grid";
import { EntityConflictsCard } from "./entity-conflicts-card";
import { AnnotationsSection } from "./annotations-section";
import type { StoredAudit } from "@/lib/services/audit";

interface Props {
  audit: StoredAudit;
}

export function AuditReport({ audit }: Props) {
  const { audit_json, figma_url, figma_file_id, run_at_utc, model, scope } =
    audit;

  const frameName = audit_json.frames[0]?.name ?? "Unnamed frame";
  const scopeLabel = scope === "full-file" ? "Full file" : "Single frame";

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header row */}
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              MX audit
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
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">
                {scopeLabel}
              </span>
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
