/**
 * /sign-in — Clerk's sign-in component on a Legible-branded page.
 * The catch-all `[[...sign-in]]` segment lets Clerk handle multi-step flows
 * (email verification, password reset, OAuth callback) under the same path.
 *
 * Brand wordmark comes from the global HeaderNav (app/layout.tsx).
 */

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 bg-neutral-50 dark:bg-neutral-950">
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
