/**
 * Settings every Sentry.init shares (browser, server, edge). The DSN is public by design: it only lets the app send
 * events to the project. Without NEXT_PUBLIC_SENTRY_DSN the SDK stays off.
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const sharedSentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Vercel exposes production / preview / development; locally it is NODE_ENV.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Every trace locally so a test always shows up; 10% in production to stay inside the span quota.
  tracesSampleRate: isDevelopment ? 1.0 : 0.1,
};
