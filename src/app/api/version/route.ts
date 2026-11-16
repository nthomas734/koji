// Which deploy is live, for UpdateBanner. KOJI_DEPLOY_ID is inlined at build
// (next.config.js), so this answers with the deploy that is serving it. Never
// cached anywhere, and the service worker never touches /api/.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { id: process.env.KOJI_DEPLOY_ID || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
