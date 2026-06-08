import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@etheria/shared"],
  images: {
    formats: ["image/webp", "image/avif"],
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
