/**
 * Clerk middleware — gates audit creation + the user dashboard.
 *
 * Public routes (no auth required, request passes through):
 *   /                         landing page
 *   /audit/[slug]             public audit reports (slug IS the share link)
 *   /api/health               ops endpoint
 *   /sign-in/(.*)             Clerk sign-in catch-all
 *   /sign-up/(.*)             Clerk sign-up catch-all
 *   /pricing                  pricing stub
 *
 * Protected routes (`auth.protect()` enforces sign-in, redirects to /sign-in):
 *   /audits(.*)               user dashboard
 *   /api/audit                creating audits requires an authenticated user
 *
 * Anything not listed in `isProtectedRoute` defaults to public — that's why
 * static assets, `/`, and `/audit/[slug]` work without sign-in.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/audits(.*)",
  "/api/audit",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless they have query params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run middleware on API routes
    "/(api|trpc)(.*)",
  ],
};
