/**
 * Landing page at / — full marketing surface for Legible.
 *
 * Sections (in order):
 *   1. Hero with audit form (or sign-up CTA for signed-out)
 *   2. Stat strip — quantified evidence (the data, not testimonials)
 *   3. How it works (3 steps)
 *   4. Problem / What Legible does (two-column)
 *   5. Features (4 blocks with mocks)
 *   6. Pricing (inline snapshot)
 *   7. FAQ (six common questions, native <details>)
 *   8. Second CTA — form again at the bottom
 *   9. Footer
 *
 * Auth gate: signed-in users see the audit form at top + bottom.
 * Signed-out visitors see the sign-up CTA in the form's place. Server-side
 * via Clerk's auth() so there's no client-side flash.
 *
 * Voice: warm Notion-leaning per Josh's voice + ux-microcopy + no-em-dash.
 * Built per the landing-page-builder skill, Mercury aesthetic lane.
 */

import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  AlertTriangle,
  Braces,
  Clipboard,
  Clock,
  Eye,
  FileText,
  Share2,
} from "lucide-react";
import { AuditForm } from "@/components/audit-form";
import { SignUpCta } from "@/components/sign-up-cta";
import { PaperTexture } from "@/components/paper-texture";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="relative isolate min-h-screen text-legible-text bg-legible-bg">
      {/* Crumpled-paper texture, scoped to <main> so the nav stays clean.
          Opacity animates from a low peak at the top of the page to 0 by
          ~1500px of scroll. Implemented in a client component to drive the
          inline opacity from the scroll position. */}
      <PaperTexture />

      {/* ============ HERO ============ */}
      <section className="max-w-xl mx-auto px-6 pt-16 md:pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="font-brand text-[28px] md:text-[35px] leading-[1.345] tracking-tight text-legible-orange mb-4">
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
        </div>

        <FormCard isSignedIn={isSignedIn} />

        <p className="text-center text-xs text-legible-text-faded mt-6">
          Free during beta. Sign up to start.{" "}
          <Link
            href="#pricing"
            className="underline underline-offset-2 hover:text-legible-orange transition-colors"
          >
            See pricing →
          </Link>
        </p>
      </section>

      {/* ============ SAMPLE REPORT PREVIEW ============ */}
      <section className="max-w-3xl mx-auto px-6 pb-16 md:pb-24">
        <p className="text-center text-[11px] uppercase tracking-wider text-legible-text-faded mb-6">
          What you get
        </p>
        <SampleReport />
      </section>

      {/* ============ STAT STRIP ============ */}
      <section className="bg-white/40 border-y border-legible-cream">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <Stat
              big="51%"
              body="of web traffic is now non-human, and growing."
            />
            <Stat
              big="78% → 28%"
              body="Task success drops when the accessibility tree is impoverished."
            />
            <Stat
              big="13×"
              body="Higher conversion from AI-sourced visitors than from traditional search."
            />
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <SectionHeader
          eyebrow="How it works"
          title="From Figma file to shareable audit in under a minute."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
          <Step
            n="01"
            icon={<Clipboard className="w-5 h-5" />}
            title="Paste your Figma file URL."
            body="Any file you can access works. Scope to a single frame if you want a quick check."
          />
          <Step
            n="02"
            icon={<Clock className="w-5 h-5" />}
            title="Wait about 30 seconds."
            body="Claude reads your design and runs ten AX categories: semantic structure, schema, entity consistency, and more."
          />
          <Step
            n="03"
            icon={<FileText className="w-5 h-5" />}
            title="Get a shareable report."
            body="Designer view and engineer view in one place, color-coded by priority. Send the link to your dev or your team."
          />
        </div>
      </section>

      {/* ============ PROBLEM / WHAT WE DO ============ */}
      <section className="bg-white/40 border-y border-legible-cream">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 md:gap-16">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-legible-text-faded mb-3">
              The problem
            </p>
            <h2 className="font-brand text-2xl md:text-3xl text-legible-text mb-5 leading-tight">
              AI agents now browse your site for your users. They don't see what
              humans see.
            </h2>
            <p className="text-base text-legible-text-muted leading-relaxed mb-4">
              ChatGPT Atlas, Perplexity Comet, Google Mariner, and the other
              autonomous browsers parse the accessibility tree and the DOM, not
              the pixels you spent weeks polishing.
            </p>
            <p className="text-base text-legible-text-muted leading-relaxed">
              When your design has impoverished semantics, the agent gives up or
              guesses wrong. The conversion goes to the site the agent could
              actually read.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-legible-text-faded mb-3">
              What Legible does
            </p>
            <h2 className="font-brand text-2xl md:text-3xl text-legible-text mb-5 leading-tight">
              Audits your Figma file for AX, in language your designer and your
              developer both speak.
            </h2>
            <p className="text-base text-legible-text-muted leading-relaxed mb-4">
              The same signals that help screen readers help agents, plus a few
              agent-specific ones: schema markup, entity naming consistency,
              server-rendered content.
            </p>
            <p className="text-base text-legible-text-muted leading-relaxed">
              Legible checks all of them and tells your team exactly what to
              change, with two views of every recommendation so nothing gets
              lost in handoff.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <SectionHeader
          eyebrow="Features"
          title="Built for the handoff between designer and developer."
        />
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<Eye className="w-5 h-5" />}
            title="Dual-view annotations"
            body="Every issue gets two recommendations: one in designer vocabulary (frames, layers, components), one in engineer vocabulary (HTML, ARIA, schema). Nobody has to translate."
            mock={
              <div className="space-y-2">
                <div className="bg-legible-bg rounded-md p-3 border border-legible-cream">
                  <div className="text-[10px] uppercase tracking-wider text-legible-text-faded mb-1">
                    Design view
                  </div>
                  <div className="text-xs text-legible-text leading-snug">
                    Mark this frame as the primary content region of the page.
                  </div>
                </div>
                <div className="bg-legible-bg rounded-md p-3 border border-legible-cream">
                  <div className="text-[10px] uppercase tracking-wider text-legible-text-faded mb-1">
                    Engineer view
                  </div>
                  <code className="text-xs font-mono text-legible-text">
                    {"<main>...page content...</main>"}
                  </code>
                </div>
              </div>
            }
          />
          <FeatureCard
            icon={<Braces className="w-5 h-5" />}
            title="Schema markup that agents read"
            body="Recommends the right schema.org type per component with copy-paste JSON-LD. Product, FAQPage, HowTo, Article, Event, and others Claude knows agents look for."
            mock={
              <div className="bg-legible-bg rounded-md p-3 border border-legible-cream">
                <div className="text-[10px] uppercase tracking-wider text-legible-text-faded mb-2">
                  Suggested markup
                </div>
                <pre className="text-[11px] font-mono text-legible-text whitespace-pre-wrap leading-relaxed">{`{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "..."
}`}</pre>
              </div>
            }
          />
          <FeatureCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Entity conflict detection"
            body="On full-file audits, Legible flags naming inconsistencies across frames before they ship as bugs. Two product names for the same product. Two version numbers. Two prices."
            mock={
              <div className="space-y-2">
                <div className="bg-legible-bg rounded-md p-3 border border-legible-cream flex items-center justify-between">
                  <div className="text-xs text-legible-text">Hero frame</div>
                  <code className="text-[11px] font-mono text-legible-orange">
                    SoloDesk Pro
                  </code>
                </div>
                <div className="bg-legible-bg rounded-md p-3 border border-legible-cream flex items-center justify-between">
                  <div className="text-xs text-legible-text">
                    Pricing frame
                  </div>
                  <code className="text-[11px] font-mono text-legible-orange">
                    Solo Desk
                  </code>
                </div>
                <p className="text-[11px] italic text-legible-text-faded text-center pt-1">
                  2 inconsistent product names found.
                </p>
              </div>
            }
          />
          <FeatureCard
            icon={<Share2 className="w-5 h-5" />}
            title="Shareable reports, no login required"
            body="Every audit gets a public URL you can send to your dev, your PM, or your manager. They see the recommendations without signing up for anything."
            mock={
              <div className="bg-legible-bg rounded-md p-3 border border-legible-cream font-mono text-[11px] text-legible-text-muted">
                legible.design/audit/a1b2c3d4e5
              </div>
            }
          />
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section
        id="pricing"
        className="bg-white/40 border-y border-legible-cream"
      >
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
          <p className="text-[11px] uppercase tracking-wider text-legible-text-faded mb-3">
            Pricing
          </p>
          <h2 className="font-brand text-2xl md:text-3xl text-legible-text mb-4 leading-tight">
            Free during beta. Honest pricing after.
          </h2>
          <p className="text-base text-legible-text-muted leading-relaxed mb-10 max-w-xl mx-auto">
            Your first three audits are free while Legible's in beta. Credit
            packs land after the cohort has had time to use it and tell me
            what's worth what.
          </p>
          <div className="inline-flex flex-col gap-3 text-sm text-legible-text-muted min-w-[260px]">
            <PricingRow label="First 3 audits" value="Free" />
            <PricingRow label="Credit packs" value="From $5" />
            <PricingRow
              label="Per-audit pricing"
              value="TBD after beta"
              muted
            />
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <SectionHeader eyebrow="FAQ" title="Questions worth answering." />
        <div className="space-y-3">
          <Faq
            q="What is AX (Agentic Experience)?"
            a="AX is what AI agents see when they crawl your site. Same idea as UX, but for non-human users. As AI traffic crosses 50% of all web visits, the AX of your site starts to matter as much as the UX."
          />
          <Faq
            q="How is this different from accessibility (a11y)?"
            a="Same underlying signals. Agents and screen readers both parse the accessibility tree. AX adds schema markup, entity naming consistency, and JS-rendering checks that most a11y tools don't cover. Think of AX as the superset."
          />
          <Faq
            q="Do I need a developer to use this?"
            a="No. The Design view of every audit speaks designer language: frames, layers, components, handoff notes. Hand the Engineer view to your dev for the technical implementation, and you're done."
          />
          <Faq
            q="Is my Figma token safe?"
            a="Used once to fetch the file, then discarded. Never stored, never logged. Revoke the token in Figma after each audit if you want extra paranoia."
          />
          <Faq
            q="Will Legible work on a private file?"
            a="Yes, as long as your token has access. Legible uses your personal access token, so any file you can open in Figma, Legible can audit."
          />
          <Faq
            q="What if I don't see the issue in my file?"
            a="Every annotation names the frame and the layer. Re-open the file in Figma, find the layer, fix it. If you'd rather hand it off, the engineer view has copy-paste code your dev can use directly."
          />
        </div>
      </section>

      {/* ============ SECOND CTA ============ */}
      <section className="bg-white/40 border-y border-legible-cream">
        <div className="max-w-xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-8">
            <h2 className="font-brand text-2xl md:text-3xl text-legible-text mb-3 leading-tight">
              See where your file stands.
            </h2>
            <p className="text-base text-legible-text-muted">
              Paste a Figma URL. Get a shareable report in 30 seconds. No card
              needed during beta.
            </p>
          </div>
          <FormCard isSignedIn={isSignedIn} />
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-legible-cream">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link
                href="/"
                className="font-brand text-xl text-legible-orange hover:opacity-80 transition-opacity"
              >
                Legible
              </Link>
              <p className="text-xs text-legible-text-faded mt-3 leading-relaxed max-w-[200px]">
                AX audits for the agentic web.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                { href: "#pricing", label: "Pricing" },
                { href: "/audits", label: "My audits" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                {
                  href: "mailto:hello@legible.design",
                  label: "Contact",
                },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ]}
            />
          </div>
          <div className="pt-8 border-t border-legible-cream flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-legible-text-faded">
            <p>
              © 2026 Legible. Powered by Anthropic Claude. Not affiliated with
              Figma.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com"
                aria-label="X / Twitter"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-legible-orange transition-colors"
              >
                <IconX className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-legible-orange transition-colors"
              >
                <IconLinkedIn className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/knightjek23/MX-APP"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-legible-orange transition-colors"
              >
                <IconGitHub className="w-4 h-4" />
              </a>
              <span className="italic ml-2">Made with care by Josh.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Section helpers — kept inline since each is tiny and only used here.        */
/* -------------------------------------------------------------------------- */

function FormCard({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="relative bg-white dark:bg-legible-surface border border-legible-cream rounded-2xl shadow-[0_0_50px_0_rgba(125,48,24,0.12)] dark:shadow-[0_0_50px_0_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="relative p-8 md:p-10">
        {isSignedIn ? (
          <Suspense fallback={<div className="h-96" />}>
            <AuditForm />
          </Suspense>
        ) : (
          <SignUpCta />
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="text-center mb-12 md:mb-14">
      <p className="text-[11px] uppercase tracking-wider text-legible-text-faded mb-3">
        {eyebrow}
      </p>
      <h2 className="font-brand text-2xl md:text-3xl text-legible-text leading-tight max-w-2xl mx-auto">
        {title}
      </h2>
    </div>
  );
}

function Stat({ big, body }: { big: string; body: string }) {
  return (
    <div>
      <div className="font-brand text-4xl md:text-5xl text-legible-orange mb-3">
        {big}
      </div>
      <p className="text-sm text-legible-text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-legible-orange/10 text-legible-orange">
          {icon}
        </div>
        <div className="font-brand text-2xl text-legible-orange">{n}</div>
      </div>
      <h3 className="font-medium text-base text-legible-text mb-2 leading-snug">
        {title}
      </h3>
      <p className="text-sm text-legible-text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  mock,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  mock: React.ReactNode;
}) {
  return (
    <div className="bg-white/60 border border-legible-cream rounded-2xl p-6 md:p-8 flex flex-col gap-5">
      <div>
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-legible-orange/10 text-legible-orange mb-4">
          {icon}
        </div>
        <h3 className="font-brand text-lg text-legible-text mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm text-legible-text-muted leading-relaxed">
          {body}
        </p>
      </div>
      <div>{mock}</div>
    </div>
  );
}

function PricingRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-12 px-4 py-3 rounded-lg bg-white/70 border border-legible-cream">
      <span>{label}</span>
      <span
        className={
          muted
            ? "italic text-legible-text-faded"
            : "font-brand text-legible-orange"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white/60 border border-legible-cream rounded-xl px-5 py-4 cursor-pointer">
      <summary className="font-medium text-sm text-legible-text flex items-center justify-between list-none">
        <span>{q}</span>
        <span className="text-legible-orange text-xl leading-none transition-transform group-open:rotate-45 select-none">
          +
        </span>
      </summary>
      <p className="text-sm text-legible-text-muted leading-relaxed mt-3">
        {a}
      </p>
    </details>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-legible-text-faded mb-3">
        {title}
      </p>
      <ul className="space-y-2 text-sm text-legible-text-muted">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="hover:text-legible-orange transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Stylized preview of a Legible audit report. Built from divs (not a real
 * screenshot) so it stays self-contained and adapts to dark mode. Sits below
 * the hero so cold visitors can see the shape of the deliverable before they
 * paste a URL.
 */
function SampleReport() {
  return (
    <div className="bg-white dark:bg-legible-surface border border-legible-cream rounded-2xl shadow-[0_0_50px_0_rgba(125,48,24,0.10)] dark:shadow-[0_0_50px_0_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Browser chrome. Fully opaque bg so the page-level paper texture
          can't bleed through the strip into the audit example. */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-legible-cream bg-legible-bg dark:bg-legible-surface">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden />
          <span
            className="w-2.5 h-2.5 rounded-full bg-emerald-400"
            aria-hidden
          />
        </div>
        <div className="flex-1 px-3 py-1 rounded-md bg-white border border-legible-cream font-mono text-[11px] text-legible-text-faded truncate">
          legible.design/audit/a1b2c3d4e5
        </div>
      </div>

      {/* Report content */}
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-legible-cream">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-legible-text-faded mb-1">
              AX audit
            </p>
            <h3 className="text-base font-medium text-legible-text truncate">
              SoloDesk · Home
            </h3>
            <p className="text-[11px] text-legible-text-faded mt-1">
              Full file · claude-sonnet-4-5
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-legible-text-faded mb-1">
              AX score
            </p>
            <p className="font-brand text-3xl leading-none text-amber-600">
              67
              <span className="text-sm text-legible-text-faded font-normal ml-1">
                / 100
              </span>
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <SummaryCard label="Critical" code="P1" count={2} tone="red" />
          <SummaryCard label="Important" code="P2" count={4} tone="amber" />
          <SummaryCard label="Suggested" code="P3" count={1} tone="blue" />
        </div>

        {/* Sample annotations */}
        <div className="space-y-2">
          <AnnotationRow
            priority="P1"
            tone="red"
            category="Page structure"
            text="Mark this frame as the primary content region for the page."
          />
          <AnnotationRow
            priority="P2"
            tone="amber"
            category="Naming consistency"
            text="Two product names found across frames. Standardize before handoff."
          />
          <AnnotationRow
            priority="P3"
            tone="blue"
            category="Content type"
            text="Add Product schema markup so agents can quote price and rating."
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  code,
  count,
  tone,
}: {
  label: string;
  code: string;
  count: number;
  tone: "red" | "amber" | "blue";
}) {
  const toneClasses = {
    red: "bg-red-50 border-red-200/50 text-red-600",
    amber: "bg-amber-50 border-amber-200/50 text-amber-600",
    blue: "bg-blue-50 border-blue-200/50 text-blue-600",
  }[tone];
  return (
    <div className={`border rounded-xl px-3 py-3 ${toneClasses}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-legible-text-faded">
          {label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {code}
        </span>
      </div>
      <div className="text-2xl font-medium mt-1">{count}</div>
    </div>
  );
}

function AnnotationRow({
  priority,
  tone,
  category,
  text,
}: {
  priority: string;
  tone: "red" | "amber" | "blue";
  category: string;
  text: string;
}) {
  const pillClasses = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  }[tone];
  return (
    <div className="bg-legible-bg border border-legible-cream rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
        <span
          className={`${pillClasses} px-2 py-0.5 rounded-md font-medium tracking-wide`}
        >
          {priority}
        </span>
        <span className="text-legible-text-faded">{category}</span>
      </div>
      <p className="text-sm text-legible-text leading-snug">{text}</p>
    </div>
  );
}

/* Brand-mark SVGs. Lucide deprecated these icons (they don't fit the open-
   source icon set), so they're inlined here with currentColor fills. */

function IconX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGitHub({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
