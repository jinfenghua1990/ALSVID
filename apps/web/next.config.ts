import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  outputFileTracingRoot: path.join(appDirectory, '../..'),
  agentRules: false,
  transpilePackages: ['@alsvid/ui'],
};

export default nextConfig;
