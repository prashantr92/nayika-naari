import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Purani images ke liye
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io', // 🌟 NAYA: ImageKit CDN ke liye
      },
    ],
  },
};

export default nextConfig;