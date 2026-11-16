/** @type {import('next').NextConfig} */
const nextConfig = {
  // The deploy this build belongs to, inlined into the client bundle (where
  // UpdateBanner compares it with /api/version) and the server. Vercel sets
  // VERCEL_DEPLOYMENT_ID at build; empty locally, which turns the banner off.
  env: { KOJI_DEPLOY_ID: process.env.VERCEL_DEPLOYMENT_ID || '' },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

module.exports = nextConfig;
