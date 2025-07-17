import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for desktop packaging
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  
  // Optimize for desktop environment
  images: {
    unoptimized: true
  },
  
  // Ensure proper static file handling
  trailingSlash: true,
  
  // Enable external packages for better performance
  serverExternalPackages: ['@prisma/client'],
  
  // Exclude test files from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { isServer }) => {
    // Exclude test directories and files from build
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      use: 'ignore-loader'
    });
    
    return config;
  }
};

export default nextConfig;
