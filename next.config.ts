import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
