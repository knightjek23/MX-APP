/**
 * SignUpCta — replaces the audit form on the landing page when the
 * visitor is not signed in. Drives them to /sign-up with /sign-in as
 * a secondary action.
 *
 * Server component. Rendered conditionally from app/page.tsx based on
 * auth() state — no client-side flash, no flicker.
 */

import Link from "next/link";

export function SignUpCta() {
  return (
    <div className="text-center">
      <p className="text-base font-light text-legible-text mb-2">
        Sign up to run your first audit
      </p>
      <p className="text-sm font-light text-legible-text-muted mb-6 max-w-sm mx-auto leading-relaxed">
        Free during beta. Sign in with email or Google. Audits stay on your
        account so you can revisit and share them.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-legible-orange text-white font-mono text-sm shadow-[inset_0_0_0_2px_var(--legible-orange-inner),0_0_0_2px_var(--legible-orange-edge)] hover:opacity-90 transition-opacity"
        >
          Sign up
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-light text-legible-text-muted hover:text-legible-orange transition-colors underline underline-offset-2"
        >
          or sign in
        </Link>
      </div>
    </div>
  );
}
