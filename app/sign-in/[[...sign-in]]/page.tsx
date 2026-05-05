/**
 * /sign-in — Clerk's sign-in component on a Legible-branded page.
 * The catch-all `[[...sign-in]]` segment lets Clerk handle multi-step flows
 * (email verification, password reset, OAuth callback) under the same path.
 */

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="text-sm font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-8 hover:opacity-70 transition-opacity"
      >
        Legible
      </Link>
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
          },
        }}
        signUpUrl="/sign-up"
      />
    </main>
  );
}
