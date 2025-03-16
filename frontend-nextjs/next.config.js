/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove or comment out the 'export' output setting
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Remove public exposure of API keys
};

module.exports = nextConfig;
