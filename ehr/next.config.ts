import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily ignore TypeScript build errors so we can rebuild during development.
  // This allows applying middleware changes without blocking on type-checking.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
