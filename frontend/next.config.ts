import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.45', 'localhost'],
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3001/auth/:path*',
      },
      {
        source: '/students/:path*',
        destination: 'http://localhost:3001/students/:path*',
      },
      {
        source: '/menu/:path*',
        destination: 'http://localhost:3001/menu/:path*',
      },
      {
        source: '/transactions/:path*',
        destination: 'http://localhost:3001/transactions/:path*',
      },
      {
        source: '/analytics/:path*',
        destination: 'http://localhost:3001/analytics/:path*',
      },
    ];
  },
};

export default nextConfig;
