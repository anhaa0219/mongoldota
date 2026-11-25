import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry/sentry-options";

/**
 * Sentry in the browser, before the app becomes interactive. Session Replay masks all text and inputs and blocks
 * images by default; it keeps 10% of normal visits and every visit that hits an error.
 */
Sentry.init({
  ...sharedSentryOptions,
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

/** Times App Router navigations as traces. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
