import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project. Without this, Next can pick up a
  // stray package-lock.json in a parent folder (e.g. the home directory) and
  // mis-infer the root, which breaks output tracing / env loading.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
