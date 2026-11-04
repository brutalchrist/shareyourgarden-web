// The visitor's approximate position, from their IP address, so the map can
// open on their city before (or without) the browser's geolocation. Netlify
// looks up the IP itself: nothing is sent to a third party or stored.
//
// The subset of Netlify's edge function context used here; the full types
// live in `@netlify/edge-functions`, which this Next.js project doesn't need.
interface Context {
  geo: { latitude?: number; longitude?: number }
}

export default function geo(_request: Request, context: Context) {
  const { latitude, longitude } = context.geo

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return new Response(null, { status: 204 })
  }

  return Response.json(
    { latitude, longitude },
    // Per visitor and per network: never shared by a cache.
    { headers: { "Cache-Control": "private, no-store" } }
  )
}

export const config = { path: "/api/geo" }
