/**
 * /pricing — stub for Week 1 per PROJECT.md §7.
 * Real credit pack pricing lands Month 1 when Stripe wires up.
 */

import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-sm font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-12">
          Legible
        </div>
        <h1 className="text-3xl font-medium mb-4 tracking-tight">Pricing</h1>
        <p className="text-base text-neutral-600 dark:text-neutral-400 mb-2">
          Beta is free for the first 3 audits.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-12">
          Credit packs coming soon. We&apos;re collecting feedback to set fair
          per-audit pricing.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          ← Back to audit
        </Link>
      </div>
    </main>
  );
}
