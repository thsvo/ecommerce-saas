/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'res.cloudinary.com', 'images.unsplash.com', "via.placeholder.com", "i.ibb.co"], 
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/server/:path*',
        destination: 'https://codeopx.com/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig;
