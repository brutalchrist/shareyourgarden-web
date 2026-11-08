import type { Garden } from "@/lib/types"

const MIN_OFFSET_METERS = 150
const MAX_OFFSET_METERS = 400
const METERS_PER_DEGREE_LAT = 111_320

// FNV-1a: a stable number per string, so a garden always lands on the same
// spot instead of jumping on every fetch.
function hash(value: string): number {
  let result = 2166136261

  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i)
    result = Math.imul(result, 16777619)
  }

  return result >>> 0
}

/**
 * Moves a garden's pin a few hundred meters, always the same way for the same
 * garden. The public map shows this instead of the point the owner chose.
 *
 * This only changes what is drawn: the API still sends the exact point, so a
 * backend change is needed to keep it from leaving the server.
 */
export function approximateGarden(garden: Garden): Garden {
  const [lng, lat] = garden.location.coordinates
  const seed = hash(garden.id)
  const angle = ((seed % 3600) / 3600) * 2 * Math.PI
  const distance =
    MIN_OFFSET_METERS +
    (((seed >>> 12) % 1000) / 1000) * (MAX_OFFSET_METERS - MIN_OFFSET_METERS)
  const dLat = (Math.sin(angle) * distance) / METERS_PER_DEGREE_LAT
  const dLng =
    (Math.cos(angle) * distance) /
    (METERS_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))

  return {
    ...garden,
    location: { ...garden.location, coordinates: [lng + dLng, lat + dLat] },
  }
}
