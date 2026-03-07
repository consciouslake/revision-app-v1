import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy to backend (handling Docker networking)
        source: '/backend-api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000'}/:path*`,
      },
    ]
  },
};

export default nextConfig;
