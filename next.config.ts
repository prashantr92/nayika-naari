import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // 🌟 Tumhara Supabase storage URL allow karega
      },
    ],
  },
};

export default nextConfig;