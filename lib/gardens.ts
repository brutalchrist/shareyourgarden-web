import type { LngLatBounds } from "maplibre-gl"

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import { toGarden, type Garden, type GardenInput } from "@/lib/types"

export function getGardensFromBounds(
  bounds: LngLatBounds,
  where: string,
  signal?: AbortSignal
): Promise<Garden[]> {
  const corners = [
    bounds.getNorthWest(),
    bounds.getNorthEast(),
    bounds.getSouthEast(),
    bounds.getSouthWest(),
    bounds.getNorthWest(),
  ]

  return getGardensInPolygon(
    corners.map(({ lng, lat }) => [lng, lat]),
    where,
    signal
  )
}

// Gardens in a square about `radiusKm` from the center to each side, for
// places without a map to take bounds from (the landing).
export function getGardensNear(
  [lng, lat]: [number, number],
  radiusKm: number,
  signal?: AbortSignal
): Promise<Garden[]> {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1))

  return getGardensInPolygon(
    [
      [lng - dLng, lat + dLat],
      [lng + dLng, lat + dLat],
      [lng + dLng, lat - dLat],
      [lng - dLng, lat - dLat],
      [lng - dLng, lat + dLat],
    ],
    "",
    signal
  )
}

async function getGardensInPolygon(
  polygon: number[][],
  where: string,
  signal?: AbortSignal
): Promise<Garden[]> {
  const params = new URLSearchParams({
    polygon: JSON.stringify(polygon),
    where,
  })

  const data = await apiGet<unknown[]>(`/gardens?${params}`, { signal })

  return data.map(toGarden)
}

export async function getMyGardens(): Promise<Garden[]> {
  const data = await apiGet<unknown[]>("/gardens/mine")

  return data.map(toGarden)
}

export async function getGarden(id: string): Promise<Garden> {
  return toGarden(await apiGet<unknown>(`/gardens/${encodeURIComponent(id)}`))
}

export async function createGarden(input: GardenInput): Promise<Garden> {
  return toGarden(await apiPost<unknown>("/gardens", input))
}

export async function updateGarden(
  id: string,
  input: Partial<GardenInput>
): Promise<Garden> {
  return toGarden(
    await apiPatch<unknown>(`/gardens/${encodeURIComponent(id)}`, input)
  )
}

export function deleteGarden(id: string): Promise<void> {
  return apiDelete(`/gardens/${encodeURIComponent(id)}`)
}

// Query params instead of dynamic segments: the static export has no server to
// render a page per garden id.
// `section` opens one part of the form: alone on phones, scrolled to on larger
// screens.
export function gardenEditHref(id: string, section?: "products"): string {
  return `/gardens/edit/?${new URLSearchParams(section ? { id, section } : { id })}`
}

export function gardenMapHref(garden: Garden): string {
  const [lng, lat] = garden.location.coordinates

  return `/map/?${new URLSearchParams({
    garden: garden.id,
    lat: String(lat),
    lng: String(lng),
  })}`
}
