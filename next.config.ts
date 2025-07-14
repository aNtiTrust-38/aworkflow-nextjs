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
  serverExternalPackages: ['@prisma/client']
};

export default nextConfig;
