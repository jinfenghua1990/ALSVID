import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  agentRules: false,
  transpilePackages: ['@alsvid/ui'],
};

export default nextConfig;
