/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  transpilePackages: ["@volo/shared-lib", "@volo/shared-types"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
