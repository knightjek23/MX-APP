"use client";

/**
 * AnnotationCard — one audit annotation, rendered for either Designer or
 * Engineer view based on the `view` prop.
 *
 * Designer view: design_recommendation + design_rationale. No code section.
 * Engineer view: recommendation + rationale + collapsible code_hint.
 *
 * Falls back gracefully for old audits (pre-dual-view) that lack the
 * design_* fields — those fall back to engineer copy with a small note.
 */

import { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import type { Annotation, Category, Priority } from "@/lib/types/audit";
import type { AnnotationView } from "./view-toggle";

interface Props {
  annotation: Annotation;
  index: number;
  total: number;
  view: AnnotationView;
  defaultExpanded?: boolean;
}

const CATEGORY_LABELS: Record<Category, string> = {
  semantic_html: "Semantic HTML",
  aria: "ARIA",
  schema: "Schema",
  hidden_content: "Hidden content",
  entity: "Entity",
  initial_html: "Initial HTML",
  contrast: "Contrast",
  personalization: "Personalization",
  empty_state: "Empty state",
  figma_export: "Figma export",
};

// Designer-friendly category labels for Design view. Same enum, plain language.
const CATEGORY_LABELS_DESIGN: Record<Category, string> = {
  semantic_html: "Page structure",
  aria: "Accessibility labels",
  schema: "Content type",
  hidden_content: "Hidden content",
  entity: "Naming consistency",
  initial_html: "Page load",
  contrast: "Contrast",
  personalization: "Dynamic content",
  empty_state: "Empty states",
  figma_export: "Export risk",
};

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string }> = {
  P1: {
    bg: "bg-red-100 dark:bg-red-950/60",
    text: "text-red-700 dark:text-red-400",
  },
  P2: {
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-400",
  },
  P3: {
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-400",
  },
};

export function AnnotationCard({
  annotation,
  index,
  total,
  view,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const priority = PRIORITY_STYLES[annotation.priority];
  const hasCode = annotation.code_hint && annotation.code_hint.trim().length > 0;

  // Pick the right copy for the active view. If design view is selected but
  // the audit predates the dual-view feature, fall back to engineer copy.
  const isDesignView = view === "design";
  const designCopyMissing = isDesignView &&
    (!annotation.design_recommendation || !annotation.design_rationale);

  const recommendation = isDesignView && annotation.design_recommendation
    ? annotation.design_recommendation
    : annotation.recommendation;

  const rationale = isDesignView && annotation.design_rationale
    ? annotation.design_rationale
    : annotation.rationale;

  const categoryLabel = isDesignView
    ? CATEGORY_LABELS_DESIGN[annotation.category]
    : CATEGORY_LABELS[annotation.category];

  // Code section only shows in engineer view. Designers don't write code.
  const showCodeSection = !isDesignView && hasCode;

  const copy = async () => {
    if (!annotation.code_hint) return;
    try {
      await navigator.clipboard.writeText(annotation.code_hint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail — clipboard API requires secure context or permission
    }
  };

  return (
    <article className="bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span
            className={`${priority.bg} ${priority.text} px-2 py-0.5 rounded-md font-medium tracking-wide`}
          >
            {annotation.priority}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {categoryLabel}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500 ml-auto">
            {index + 1} of {total}
          </span>
        </div>

        <h3 className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-1.5">
          {recommendation}
        </h3>
        <p className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {rationale}
        </p>

        {designCopyMissing && (
          <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-500 italic">
            Showing engineer view — this audit was generated before the design view existed. Re-run to see designer-facing copy.
          </p>
        )}
      </div>

      {showCodeSection && (
        <div className="border-t border-neutral-200/70 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <span className="font-medium">Suggested markup</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {expanded && (
            <div className="relative bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200/70 dark:border-neutral-800">
              <button
                type="button"
                onClick={copy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre className="p-4 pr-12 text-xs font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre-wrap break-words">
                <code>{annotation.code_hint}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
