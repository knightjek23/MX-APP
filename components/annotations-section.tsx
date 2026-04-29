"use client";

/**
 * AnnotationsSection — client wrapper that holds the category filter
 * state and renders the filtered AnnotationCard list.
 *
 * Separated from AuditReport (server) so the filter can live in the
 * client without forcing the whole report tree to be client-rendered.
 */

import { useMemo, useState } from "react";
import { FilterChips } from "./filter-chips";
import { AnnotationCard } from "./annotation-card";
import type { Annotation, Category, FrameAudit } from "@/lib/types/audit";

interface Props {
  frames: FrameAudit[];
}

interface FlatAnnotation extends Annotation {
  _frameIndex: number;
  _frameName: string;
}

export function AnnotationsSection({ frames }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");

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

  // Expand the first P1 by default, collapse the rest.
  const firstP1Index = filtered.findIndex((a) => a.priority === "P1");

  return (
    <div className="space-y-4">
      <FilterChips
        allCount={flatAnnotations.length}
        categoryCounts={categoryCounts}
        activeCategory={activeCategory}
        onChange={setActiveCategory}
      />
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No annotations in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, index) => (
            <AnnotationCard
              key={`${a._frameIndex}-${index}`}
              annotation={a}
              index={index}
              total={filtered.length}
              defaultExpanded={index === firstP1Index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
