import type { LatLngBounds } from "leaflet"

import { apiGet } from "@/lib/api"
import { toGarden, type Garden } from "@/lib/types"

export async function getGardensFromBounds(
  bounds: LatLngBounds,
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
