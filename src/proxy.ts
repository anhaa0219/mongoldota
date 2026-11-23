import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Makes the Clerk session available to pages and API routes.
 * The actual login gate lives in RequireSignIn (used by the (site) layout),
 * as Clerk recommends checking auth where the data is, not by URL pattern.
 *
 * clockSkewInMs: accept session tokens from machines whose clock is up to a minute off.
 * Clerk's 5s default made a slow PC/Mac clock loop forever between "/" and "/sign-in"
 * (server rejects the token, browser still thinks it is signed in).
 */
export default clerkMiddleware({ clockSkewInMs: 60_000 });

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
