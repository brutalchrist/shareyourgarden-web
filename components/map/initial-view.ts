// Where the map opens. Several sources can place it, arriving at different
// times; a later one only moves the map if it is more precise than the one
// shown (and the user hasn't moved the map yet, see GardenMap).
export const ViewSource = {
  // The whole world: nothing better known yet.
  none: 0,
  // The visitor's city, from their IP address (`/api/geo`).
  approximate: 1,
  // The signed-in user's first garden.
  ownGarden: 2,
  // Where the map was last left on this device.
  saved: 3,
  // The browser's geolocation.
  precise: 4,
  // A garden linked from elsewhere (`?lat=…&lng=…`).
  focus: 5,
} as const

export type ViewSource = (typeof ViewSource)[keyof typeof ViewSource]

export interface MapViewState {
  center: [number, number]
  zoom: number
}

const SAVED_VIEW_KEY = "map-view"
// Views zoomed further out don't say where the user is interested in.
const MIN_SAVED_ZOOM = 8

export function readSavedView(): MapViewState | null {
  try {
    const view = JSON.parse(localStorage.getItem(SAVED_VIEW_KEY) ?? "null")
    const [lng, lat] = view?.center ?? []

    return Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      Number.isFinite(view.zoom)
      ? { center: [lng, lat], zoom: view.zoom }
      : null
  } catch {
    return null
  }
}

export function saveView(view: MapViewState) {
  if (view.zoom < MIN_SAVED_ZOOM) {
    return
  }

  try {
    localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(view))
  } catch {}
}

// `NEXT_PUBLIC_DEV_CENTER` ("lat,lng") stands in for `/api/geo`, which only
// exists on Netlify.
function devCenter(): [number, number] | null {
  const [lat, lng] = (process.env.NEXT_PUBLIC_DEV_CENTER ?? "")
    .split(",")
    .map(Number)

  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
}

// The visitor's approximate [lng, lat], or null when unknown.
export async function fetchApproximateCenter(
  signal: AbortSignal
): Promise<[number, number] | null> {
  const dev = devCenter()
  if (dev) {
    return dev
  }

  try {
    const response = await fetch("/api/geo", { signal })
    if (response.status !== 200) {
      return null
    }

    const { latitude, longitude } = await response.json()
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [longitude, latitude]
      : null
  } catch {
    return null
  }
}
