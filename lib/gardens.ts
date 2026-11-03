import type { LngLatBounds } from "maplibre-gl"

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import { toGarden, type Garden, type GardenInput } from "@/lib/types"

export async function getGardensFromBounds(
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
  const polygon = corners.map(({ lng, lat }) => [lng, lat])
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
export function gardenEditHref(id: string): string {
  return `/gardens/edit/?${new URLSearchParams({ id })}`
}

export function gardenMapHref(garden: Garden): string {
  const [lng, lat] = garden.location.coordinates

  return `/map/?${new URLSearchParams({
    garden: garden.id,
    lat: String(lat),
    lng: String(lng),
  })}`
}
