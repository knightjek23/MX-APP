"use client";

/**
 * ViewToggle — global Designer / Engineer toggle for the report.
 * Controlled by the parent AnnotationsSection. Persisted in localStorage
 * so the user's preference sticks across visits.
 */

import { Code2, Palette } from "lucide-react";

export type AnnotationView = "design" | "engineer";

interface Props {
  view: AnnotationView;
  onChange: (v: AnnotationView) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  const buttonClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
      active
        ? "bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900"
        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
    }`;

  return (
    <div
      role="tablist"
      aria-label="Annotation view"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "design"}
        onClick={() => onChange("design")}
        className={buttonClass(view === "design")}
      >
        <Palette className="w-3.5 h-3.5" />
        Design
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "engineer"}
        onClick={() => onChange("engineer")}
        className={buttonClass(view === "engineer")}
      >
        <Code2 className="w-3.5 h-3.5" />
        Engineer
      </button>
    </div>
  );
}
