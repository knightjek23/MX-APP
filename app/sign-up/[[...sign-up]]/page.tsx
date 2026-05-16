/**
 * /sign-up — Clerk's sign-up component on a Legible-branded page.
 * The catch-all `[[...sign-up]]` segment lets Clerk handle multi-step flows
 * (email verification, OAuth callback) under the same path.
 *
 * Brand wordmark comes from the global HeaderNav (app/layout.tsx).
 */

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 bg-neutral-50 dark:bg-neutral-950">
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
          },
        }}
        signInUrl="/sign-in"
      />
    </main>
  );
}
