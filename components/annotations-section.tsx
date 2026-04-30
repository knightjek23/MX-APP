"use client";

/**
 * AnnotationsSection — client wrapper that holds the category filter
 * AND the design/engineer view state for the annotation list.
 *
 * Separated from AuditReport (server) so this state lives client-side
 * without forcing the whole report tree to be client-rendered.
 *
 * View choice is persisted to localStorage so a user's preference sticks
 * across audit reports. Default = design (the primary audience).
 */

import { useEffect, useMemo, useState } from "react";
import { FilterChips } from "./filter-chips";
import { AnnotationCard } from "./annotation-card";
import { ViewToggle, type AnnotationView } from "./view-toggle";
import type { Annotation, Category, FrameAudit } from "@/lib/types/audit";

// Engineer-coded category labels (HTML / ARIA / Schema vocabulary).
const CATEGORY_LABELS_ENG: Record<Category, string> = {
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

// Designer-friendly category labels (plain language).
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

interface Props {
  frames: FrameAudit[];
}

interface FlatAnnotation extends Annotation {
  _frameIndex: number;
  _frameName: string;
}

const STORAGE_KEY = "legible:view";

export function AnnotationsSection({ frames }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [view, setView] = useState<AnnotationView>("design");

  // Load persisted view preference once on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "engineer" || saved === "design") {
        setView(saved);
      }
    } catch {
      // localStorage may be unavailable in some contexts; default to "design".
    }
  }, []);

  const handleViewChange = (next: AnnotationView) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — same as load.
    }
  };

  const flatAnnotations: FlatAnnotation[] = useMemo(() => {
    return frames.flatMap((frame, frameIndex) =>
      frame.annotations.map((a) => ({
        ...a,
        _frameIndex: frameIndex,
        _frameName: frame.name,
      }))
    );
  }, [frames]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const a of flatAnnotations) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return counts;
  }, [flatAnnotations]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return flatAnnotations;
    return flatAnnotations.filter((a) => a.category === activeCategory);
  }, [flatAnnotations, activeCategory]);

  // Expand the first P1 by default (in engineer view, where code matters).
  const firstP1Index = filtered.findIndex((a) => a.priority === "P1");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <FilterChips
          allCount={flatAnnotations.length}
          categoryCounts={categoryCounts}
          categoryLabels={view === "design" ? CATEGORY_LABELS_DESIGN : CATEGORY_LABELS_ENG}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No annotations in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, index) => (
            <AnnotationCard
              key={`${a._frameIndex}-${index}-${view}`}
              annotation={a}
              index={index}
              total={filtered.length}
              view={view}
              defaultExpanded={view === "engineer" && index === firstP1Index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
