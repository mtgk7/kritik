import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/kuponlar',     destination: '/oneriler',     permanent: true },
      { source: '/kuponlar/:id', destination: '/oneriler/:id', permanent: true },
      { source: '/ai-kupon',     destination: '/ai-oneri',     permanent: true },
    ]
  },
};

export default nextConfig;
