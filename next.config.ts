import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
        pathname: "/apps/dota2/**",
      },
      {
        // Steam profile avatars
        protocol: "https",
        hostname: "**.steamstatic.com",
        pathname: "/**",
      },
      {
        // Dota medal + star icons (MedalBadge)
        protocol: "https",
        hostname: "www.opendota.com",
        pathname: "/assets/images/dota2/rank_icons/**",
      },
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "kenshi-hh",
  project: "mongoldota",
  // Uploads source maps at build time so production stack traces stay readable. Without the token, uploads are skipped.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Only print source map upload logs in CI.
  silent: !process.env.CI,
});
