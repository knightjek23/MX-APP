/**
 * Landing page at / — hero, audit form, below-the-fold explainer.
 * Per PROJECT.md §7.
 */

import { Suspense } from "react";
import { AuditForm } from "@/components/audit-form";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-xl mx-auto px-6 py-16 md:py-24">
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="text-sm font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
            Legible
          </div>
        </div>

        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-medium leading-tight tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
            Your designs are invisible to the AI agents buying on behalf of your
            users.
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 max-w-lg mx-auto">
            Legible audits your Figma file and tells you what to fix before you
            ship.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 italic">
            51% of web traffic is non-human. Most sites are built for the other
            49%.
          </p>
        </section>

        {/* Form */}
        <section className="mb-6">
          <Suspense fallback={<div className="h-96" />}>
            <AuditForm />
          </Suspense>
        </section>

        {/* Pricing hint */}
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mb-16">
          First 3 audits free. Credit packs start at $5 —{" "}
          <a
            href="/pricing"
            className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            pricing →
          </a>
        </p>

        {/* What is MX */}
        <section className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-12">
          <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            What is Machine Experience?
          </h2>
          <p>
            AI agents like ChatGPT Atlas, Perplexity Comet, and Google Mariner
            now browse the web on behalf of their users. They parse the
            accessibility tree, the DOM, and (sometimes) the pixels. When a
            design has impoverished semantics, their task success rate drops
            from 78% to 28%.
          </p>
          <p>
            The same signals that help screen readers help agents — plus a few
            agent-specific ones: schema markup, entity naming consistency,
            server-rendered content. Legible audits your design for all of
            them and tells your devs exactly what to change.
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs pt-4">
            Powered by Anthropic Claude. Not affiliated with Figma.
          </p>
        </section>
      </div>
    </main>
  );
}
