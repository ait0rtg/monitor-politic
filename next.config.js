/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['openai'],
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
