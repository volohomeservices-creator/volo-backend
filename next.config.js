/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  transpilePackages: ['@volo/shared-lib', '@volo/shared-types'],
  webpack: (config, { isServer }) => {
    return config;
  },
};

module.exports = nextConfig;
