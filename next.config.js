/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  transpilePackages: ['@volo/shared-lib', '@volo/shared-types'],
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/',
        destination: '/api/health',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

module.exports = nextConfig;
