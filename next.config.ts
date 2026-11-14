import type { NextConfig } from "next";

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

export default nextConfig;
