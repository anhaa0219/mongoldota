/** Sentry for the Node.js server (pages, API routes, proxy). Loaded once by src/instrumentation.ts. */

import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry/sentry-options";

Sentry.init({
  ...sharedSentryOptions,
  // Answers the browser's tunnel requests (instrumentation-client.ts `tunnel: true`) and forwards them to Sentry.
  integrations: [Sentry.serveTunnelIntegration()],
});
