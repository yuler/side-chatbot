import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // refs: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-linting-during-production-builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // refs: https://nextjs.org/docs/app/api-reference/config/next-config-js/typescript
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
