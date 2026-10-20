// Public, non-sensitive release identity used to verify that the brand domain
// actually serves the expected Cloud Run Web revision after deployment.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    { service: 'alsvid-web', release: process.env.ALSVID_RELEASE_SHA ?? 'unknown' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
