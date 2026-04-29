"use client";

/**
 * FilterChips — category filter for the annotation list.
 * Controlled by the parent AnnotationsSection.
 */

import type { Category } from "@/lib/types/audit";

interface Props {
  allCount: number;
  categoryCounts: Partial<Record<Category, number>>;
  activeCategory: Category | "all";
  onChange: (c: Category | "all") => void;
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

export function FilterChips({
  allCount,
  categoryCounts,
  activeCategory,
  onChange,
}: Props) {
  const categories = (Object.keys(categoryCounts) as Category[]).filter(
    (c) => (categoryCounts[c] ?? 0) > 0
  );

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-full border transition-colors ${
      active
        ? "bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
        : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={chipClass(activeCategory === "all")}
      >
        All · {allCount}
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={chipClass(activeCategory === c)}
        >
          {CATEGORY_LABELS[c]} · {categoryCounts[c]}
        </button>
      ))}
    </div>
  );
}
