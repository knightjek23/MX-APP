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
    <header className="border-b border-legible-cream dark:border-legible-cream bg-legible-bg/95 dark:bg-legible-bg/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-xl text-legible-orange hover:opacity-80 transition-opacity"
        >
          Legible
        </Link>
        <nav className="flex items-center gap-4">
          <Show when="signed-in">
            <Link
              href="/audits"
              className="text-xs text-legible-text-muted dark:text-legible-text-muted hover:text-legible-text dark:hover:text-legible-text transition-colors"
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
              className="text-xs text-legible-text-muted dark:text-legible-text-muted hover:text-legible-text dark:hover:text-legible-text transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="font-mono text-xs px-3 py-1.5 rounded-lg bg-legible-orange text-white hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </Show>
        </nav>
      </div>
    </header>
  );
}
