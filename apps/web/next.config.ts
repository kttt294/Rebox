import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rebox/api-client", "@rebox/shared"]
};

export default nextConfig;
