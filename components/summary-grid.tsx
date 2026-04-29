/**
 * SummaryGrid — 3-card row for P1/P2/P3 counts.
 * The entity-conflicts card is a separate component because it has
 * a greyed single-frame-mode state per PROJECT.md §7.
 */

import type { AuditSummary } from "@/lib/types/audit";

interface Props {
  summary: AuditSummary;
}

export function SummaryGrid({ summary }: Props) {
  const cards = [
    {
      label: "Critical",
      level: "P1",
      count: summary.p1_count,
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-200/50 dark:border-red-900/50",
      text: "text-red-600 dark:text-red-400",
    },
    {
      label: "Important",
      level: "P2",
      count: summary.p2_count,
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-200/50 dark:border-amber-900/50",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Suggested",
      level: "P3",
      count: summary.p3_count,
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-200/50 dark:border-blue-900/50",
      text: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <div
          key={card.level}
          className={`${card.bg} ${card.border} border rounded-xl px-4 py-3`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              {card.label}
            </span>
            <span
              className={`text-[11px] font-medium uppercase tracking-wider ${card.text}`}
            >
              {card.level}
            </span>
          </div>
          <div className={`text-2xl font-medium mt-1 ${card.text}`}>
            {card.count}
          </div>
        </div>
      ))}
    </>
  );
}
