/**
 * HeaderNav — persistent top bar with brand + auth-aware actions.
 *
 * Server component. Uses Clerk v7's `<Show when="signed-in">` /
 * `<Show when="signed-out">` for conditional rendering — these replaced
 * the older `<SignedIn>` / `<SignedOut>` components in v7. UserButton
 * is Clerk's avatar+dropdown that handles sign-out and account
 * management.
 *
 * Sits in app/layout.tsx so it appears on every page including auth
 * pages — the auth pages' content is centered and dominates the screen
 * regardless.
 */

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export function HeaderNav() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity"
        >
          Legible
        </Link>
        <nav className="flex items-center gap-4">
          <Show when="signed-in">
            <Link
              href="/audits"
              className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              My audits
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
          </Show>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Sign up
            </Link>
          </Show>
        </nav>
      </div>
    </header>
  );
}
