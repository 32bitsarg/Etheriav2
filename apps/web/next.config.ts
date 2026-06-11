import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import withPWAInit from "@ducanh2912/next-pwa";

function latestChangelogVersion(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const p = join(dir, "CHANGELOG.md");
    if (existsSync(p)) {
      const m = readFileSync(p, "utf-8").match(/^##\s+\[(\d+\.\d+\.\d+(?:-[\w.]+)?)\]/m);
      if (m) return m[1];
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "0.0.0";
}

function gitBuildId(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "";
  }
}

const withPWA = withPWAInit({
  dest: "public",
  // Only cache static game images — never JS/CSS/HTML.
  // Caching Next.js chunks causes "Failed to find Server Action" after redeploys.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    exclude: [/\.js$/, /\.css$/, /\/_next\//, /assets\/audio\//],
    runtimeCaching: [
      {
        urlPattern: /\/assets\/(backgrounds|map|ui|races|buildings|notifications)\//,
        handler: "CacheFirst",
        options: {
          cacheName: "game-assets-v1",
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  transpilePackages: ["@etheria/shared"],
  env: {
    NEXT_PUBLIC_APP_VERSION: latestChangelogVersion(),
    NEXT_PUBLIC_BUILD_ID: gitBuildId(),
  },
  images: {
    formats: ["image/webp", "image/avif"],
  },
  async headers() {
    return [
      {
        source: "/version.json",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
