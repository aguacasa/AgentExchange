import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The backend at the repo root has its own package-lock.json, so Next's
  // auto-detection picks that parent directory as the workspace root and
  // Turbopack can't resolve next/ from web/node_modules. Pin the root here.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
