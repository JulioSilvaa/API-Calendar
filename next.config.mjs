/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/auth/google/callback',
        destination: '/api/auth/google/callback',
      },
    ];
  },
};

export default nextConfig;
