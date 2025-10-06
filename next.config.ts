import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for tesseract.js in Next.js
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'tesseract.js': 'tesseract.js/dist/node/index.js',
      };
    }
    return config;
  },
};

export default nextConfig;
