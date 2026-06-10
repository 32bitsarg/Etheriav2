// Live deploy identity, polled by UpdateNotifier. Returns the version/buildId
// baked into THE RUNNING SERVER BUNDLE — unlike a static version.json, it can
// never go stale or drift from the build actually being served.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || null,
    },
    { headers: { "cache-control": "no-store, must-revalidate" } }
  );
}
