import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ali-oss"],
  // 识图 API 需在 serverless 包内带上 sharp 的 linux 原生二进制（勿把 sharp 设为 external）
  outputFileTracingIncludes: {
    "/api/admin/extract-poster": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
    "/api/admin/submissions/[id]/recognize-poster": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
  },
};

export default nextConfig;
