/**
 * /audits — the user's audit dashboard.
 *
 * Server component. Middleware (middleware.ts) ensures only authenticated
 * users reach this route, so auth() always returns a userId here. The
 * defense-in-depth `if (!userId) notFound()` guards against middleware
 * config drift.
 *
 * Lists up to 50 most recent audits owned by the current user, ordered
 * created_at desc. Empty state for fresh accounts.
 *
 * Each row has a kebab (...) menu in the top-right above the score:
 * Re-run audit · Open in Figma · Copy share link. The left half (frame
 * name + metadata) is the clickable link target to the audit detail.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { AuditService, type StoredAudit } from "@/lib/services/audit";
import { getSupabaseClient } from "@/lib/db/supabase";
import { AuditRowMenu } from "@/components/audit-row-menu";

export default async function AuditsPage() {
  const { userId } = await auth();
  if (!userId) {
    // Middleware should prevent this, but guard anyway.
    notFound();
  }

  const service = new AuditService(getSupabaseClient());
  const audits = await service.listByUser(userId);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="flex items-baseline justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              My audits
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {audits.length === 0
                ? "Nothing here yet."
                : `${audits.length} ${audits.length === 1 ? "audit" : "audits"}. Most recent first.`}
            </p>
          </div>
          {audits.length > 0 && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New audit
            </Link>
          )}
        </header>

        {audits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => (
              <AuditRow key={audit.slug} audit={audit} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Force per-request render — audits are user-scoped and fresh data matters.
export const dynamic = "force-dynamic";

// --- internal components ----------------------------------------------------

function AuditRow({ audit }: { audit: StoredAudit }) {
  const frameName = audit.audit_json.frames[0]?.name ?? "Untitled frame";
  const score = audit.audit_json.summary.overall_score;
  const scopeLabel = audit.scope === "full-file" ? "Full file" : "Single frame";
  const date = formatDate(audit.created_at);
  const shareLink = `/audit/${audit.slug}`;
  const rerunUrl = `/?figma_url=${encodeURIComponent(stripFigmaQueryParams(audit.figma_url))}`;

  return (
    <div className="group bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
      <div className="p-4 flex items-start justify-between gap-4">
        {/* Left: clickable link to the audit detail */}
        <Link
          href={shareLink}
          className="flex-1 min-w-0 -m-1 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        >
          <h3 className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-1.5">
            {frameName}
          </h3>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 flex-wrap">
            <span>{scopeLabel}</span>
            <span aria-hidden>·</span>
            <span>{date}</span>
            <span aria-hidden>·</span>
            <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
              {audit.figma_file_id}
            </span>
          </div>
        </Link>
        {/* Right: menu above score */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <AuditRowMenu
            slug={audit.slug}
            shareLink={shareLink}
            rerunUrl={rerunUrl}
            figmaUrl={audit.figma_url}
          />
          <CompactScore score={score} />
        </div>
      </div>
    </div>
  );
}

function CompactScore({ score }: { score: number }) {
  const colorClass =
    score >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-baseline gap-1 shrink-0">
      <span className={`text-base font-medium ${colorClass}`}>{score}</span>
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
        / 100
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl py-16 px-6 text-center bg-white/50 dark:bg-neutral-900/40">
      <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        No audits yet
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-xs mx-auto leading-relaxed">
        Paste a Figma file URL on the home page to run your first AX audit.
        It'll show up here, with a shareable link for your team.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
      >
        Run your first audit →
      </Link>
    </div>
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
 * Strip volatile query params from Figma URLs before re-running:
 * `node-id` (so the user picks scope fresh) and `t` (cache-busting noise).
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
