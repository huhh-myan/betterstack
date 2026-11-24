/**
 * The Express API (apps/api) has no CORS headers, so the browser can't call it
 * directly from this app's origin. Every request goes to /api/* on this app
 * instead and Next.js forwards it to the API server. Set API_URL to point
 * somewhere other than the default local API.
 */
const API_URL = process.env.API_URL ?? "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
