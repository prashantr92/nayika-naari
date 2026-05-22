import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // ImageKit use kar rahe hain toh ye true hi hona chahiye
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', 
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io', 
      },
    ],
  },
};

export default nextConfig;