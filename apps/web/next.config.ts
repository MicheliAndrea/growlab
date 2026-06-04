import type { NextConfig } from "next";

const internalApiBaseUrl =
  process.env.INTERNAL_API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@growlab/openapi-client"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
