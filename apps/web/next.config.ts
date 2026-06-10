import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

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

// Same sha written into version.json at build: a client whose baked id differs
// from the served one knows a new deploy happened, even without a version bump.
function gitBuildId(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "";
  }
}

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

export default nextConfig;
