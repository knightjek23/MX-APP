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
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 md:p-10 text-center bg-white dark:bg-neutral-900">
      <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        Sign up to run your first audit
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
        Free during beta. Sign in with email or Google. Audits stay on your
        account so you can revisit and share them.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          Sign up
        </Link>
        <Link
          href="/sign-in"
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline underline-offset-2"
        >
          or sign in
        </Link>
      </div>
    </div>
  );
}
