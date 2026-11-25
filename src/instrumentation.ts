import * as Sentry from "@sentry/nextjs";

/** Runs once when a server starts: loads Sentry for the runtime it is in. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sentry/sentry-server");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("@/lib/sentry/sentry-edge");
  }
}

/** Sends errors from Server Components, route handlers and the proxy to Sentry. */
export const onRequestError = Sentry.captureRequestError;
