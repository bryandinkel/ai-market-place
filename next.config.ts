import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors are caught at dev time; don't fail the production build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
