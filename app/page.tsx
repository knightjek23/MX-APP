/**
 * Landing page at / — hero, audit form (or sign-up CTA), explainer.
 * Per PROJECT.md §7.
 *
 * Auth gate: signed-in users see the audit form. Signed-out visitors
 * see a sign-up CTA in the form's place. Gating happens server-side
 * via Clerk's auth() so there's no client-side flash of "wrong" UI.
 */

import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { AuditForm } from "@/components/audit-form";
import { SignUpCta } from "@/components/sign-up-cta";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="relative min-h-screen bg-legible-bg text-legible-text">
      {/* Decorative organic shapes — viewport-fixed so they stay put as the
          page scrolls. Hidden in dark mode. -z-10 keeps the layer behind
          content while sitting above main's bg color. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[url('/landing-bg.png')] bg-cover bg-no-repeat bg-center pointer-events-none dark:hidden"
      />
      <div className="relative max-w-xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="font-extralight text-[28px] md:text-[35px] leading-[1.345] tracking-tight text-legible-text mb-4">
            Your designs are invisible to the AI agents buying on behalf of your
            users.
          </h1>
          <p className="font-light text-base text-legible-text-muted leading-[1.65] mb-4 max-w-lg mx-auto">
            Legible audits your Figma file and tells you what to fix before you
            ship.
          </p>
          <p className="text-xs text-legible-text-faded italic">
            51% of web traffic is non-human. Most sites are built for the other
            49%.
          </p>
        </section>

        {/* Form (signed-in) or sign-up CTA (signed-out), wrapped in two-layer
            glassmorph card per Figma node 16:5966.
            - Outer wrapper: sand stroke, translucent gradient, 20px backdrop
              blur, soft drop shadow, noise overlay. Visually the "glass ring."
            - Inner card: opaque surface, cream border, drop shadow, contains
              the form content so text reads cleanly without bg interference. */}
        <section className="mb-6">
          <div className="relative rounded-[40px] border-[3px] border-legible-sand bg-gradient-to-br from-white/[0.24] to-white/[0.06] backdrop-blur-[20px] shadow-[0_0_50px_-25px_rgba(0,0,0,0.4)] p-3 md:p-4 dark:from-white/[0.06] dark:to-white/[0.02] dark:shadow-[0_0_50px_-25px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="absolute inset-0 legible-noise opacity-[0.08] mix-blend-overlay pointer-events-none" />
            <div className="relative bg-white dark:bg-legible-surface border border-legible-cream rounded-2xl shadow-[0_0_50px_0_rgba(0,0,0,0.12)] dark:shadow-[0_0_50px_0_rgba(0,0,0,0.5)]">
              <div className="p-8 md:p-10">
                {isSignedIn ? (
                  <Suspense fallback={<div className="h-96" />}>
                    <AuditForm />
                  </Suspense>
                ) : (
                  <SignUpCta />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing hint */}
        <p className="text-center text-xs text-legible-text-faded mb-16">
          Free during beta. Sign up to start.{" "}
          <a
            href="/pricing"
            className="underline underline-offset-2 hover:text-legible-orange transition-colors"
          >
            pricing →
          </a>
        </p>

        {/* What is AX */}
        <section className="space-y-4 text-sm text-legible-text-muted leading-relaxed border-t border-legible-cream pt-12">
          <h2 className="text-base font-light text-legible-text">
            What is Agentic Experience?
          </h2>
          <p>
            AI agents like ChatGPT Atlas, Perplexity Comet, and Google Mariner
            now browse the web on behalf of their users. They parse the
            accessibility tree, the DOM, and (sometimes) the pixels. When a
            design has impoverished semantics, their task success rate drops
            from 78% to 28%.
          </p>
          <p>
            The same signals that help screen readers help agents, plus a few
            agent-specific ones: schema markup, entity naming consistency,
            server-rendered content. Legible audits your design for all of
            them and tells your devs exactly what to change.
          </p>
          <p className="text-legible-text-faded text-xs pt-4">
            Powered by Anthropic Claude. Not affiliated with Figma.
          </p>
        </section>
      </div>
    </main>
  );
}
