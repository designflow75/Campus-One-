import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['campusone-canteen-staff.loca.lt', 'campusone-staff-portal.loca.lt', 'cool-swans-roll.loca.lt', 'clear-aliens-relax.loca.lt', 'open-sheep-stick.loca.lt', 'some-rabbits-grin.loca.lt', '192.168.1.45', 'localhost'],
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
