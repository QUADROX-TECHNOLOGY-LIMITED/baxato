/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['@baxato/common'],
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
