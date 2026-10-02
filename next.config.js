/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  transpilePackages: ['@volo/shared-lib', '@volo/shared-types'],
};

module.exports = nextConfig;
