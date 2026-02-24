import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "getstream.io",
      },
      {
        protocol: "https",
        hostname: "*.getstream.io",
      },
    ],
  },
};

export default nextConfig;
