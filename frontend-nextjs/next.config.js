/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove or comment out the 'export' output setting
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Explicitly expose the environment variable
  publicRuntimeConfig: {
    NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
};

module.exports = nextConfig;
