import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ali-oss"],
  outputFileTracingIncludes: {
    "/api/admin/extract-poster": [
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
    ],
    "/api/admin/submissions/[id]/recognize-poster": [
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
    ],
  },
};

export default nextConfig;
