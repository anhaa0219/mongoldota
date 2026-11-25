/** Sentry for the edge runtime (nothing runs there today; kept so an edge route is covered the day one is added). */

import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry/sentry-options";

Sentry.init(sharedSentryOptions);
