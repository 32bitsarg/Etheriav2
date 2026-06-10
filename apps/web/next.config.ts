import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

// Latest released version from CHANGELOG.md, baked into the client bundle.
// Compared at runtime against /version.json to detect new deploys.
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

const nextConfig: NextConfig = {
  transpilePackages: ["@etheria/shared"],
  env: {
    NEXT_PUBLIC_APP_VERSION: latestChangelogVersion(),
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

export default nextConfig;
