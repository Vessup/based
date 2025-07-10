import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: The port is controlled via the -p flag in the dev script or PORT env var
  // When NODE_ENV=test, we use port 3002 (configured in package.json dev:test script)
};

export default nextConfig;
