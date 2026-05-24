import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Phase 1: keep typecheck/lint forgiving so the fork boots even with the
  // legacy 27-route mess. Phase 3 consolidates the routes and Phase 4 flips
  // these back to strict.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
