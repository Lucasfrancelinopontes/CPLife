import type { NextConfig } from "next";

const localBackend = process.env.CPLIFE_LOCAL_BACKEND === "true";
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const basePath = configuredBasePath === "/" ? "" : configuredBasePath;

const nextConfig: NextConfig = {
  basePath,
  output: "export",
  images: {
    unoptimized: true,
  },
  ...(localBackend
    ? {
        async rewrites() {
          return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
        },
      }
    : {}),
};

export default nextConfig;
