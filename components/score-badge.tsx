/**
 * ScoreBadge — color-coded MX score display.
 * Tiers per PROJECT.md §7: 90+ success, 70+ warning, <70 danger.
 */

interface Props {
  score: number;
}

export function ScoreBadge({ score }: Props) {
  const tier: "success" | "warning" | "danger" =
    score >= 90 ? "success" : score >= 70 ? "warning" : "danger";

  const colorClass = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  }[tier];

  return (
    <div className="flex flex-col items-end">
      <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        MX score
      </span>
      <span className={`text-3xl font-medium leading-none mt-1 ${colorClass}`}>
        {score}
        <span className="text-base text-neutral-400 dark:text-neutral-500 font-normal">
          {" "}
          / 100
        </span>
      </span>
    </div>
  );
}
