import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
      allowedOrigins: ["77.42.30.197:8081", "localhost:3000"],
    },
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
