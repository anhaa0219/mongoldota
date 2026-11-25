/** Sentry for the Node.js server (pages, API routes, proxy). Loaded once by src/instrumentation.ts. */

import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry/sentry-options";

Sentry.init(sharedSentryOptions);
