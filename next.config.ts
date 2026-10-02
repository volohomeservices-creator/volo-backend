import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const localLoader = "./packages/shared-lib/src/lib/image-loader.ts";
const monorepoLoader = "../../packages/shared-lib/src/lib/image-loader.ts";
const imageLoaderPath = fs.existsSync(path.resolve(__dirname, localLoader)) ? localLoader : monorepoLoader;

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  transpilePackages: ["@volo/shared-lib", "@volo/shared-types"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    loader: "custom",
    loaderFile: imageLoaderPath,
  },
};

const withBundleAnalyzer = process.env.ANALYZE === "true"
  ? require("@next/bundle-analyzer")({ enabled: true })
  : (config: NextConfig) => config;

export default withBundleAnalyzer(nextConfig);
