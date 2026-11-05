// Address search through Photon (https://photon.komoot.io), an OpenStreetMap
// geocoder built for search-as-you-type. Its public instance needs no key, so
// the static export can call it directly; swap the URL to self-host it.
const PHOTON_URL = "https://photon.komoot.io/api/"
const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse"
// Languages Photon translates names into; it rejects any other (Spanish
// included) with a 400, and without one it returns the local OpenStreetMap
// names.
const PHOTON_LANGUAGES = ["en", "de", "fr"]

export interface Place {
  id: string
  name: string
  // Street, city and region, without the name.
  detail: string
  // The city (or the closest level Photon has), for short labels.
  locality?: string
  // [lng, lat], as GeoJSON stores it.
  coordinates: [number, number]
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    state?: string
    country?: string
  }
}

export async function searchPlaces(
  query: string,
  {
    near,
    locale,
    signal,
  }: {
    near?: [number, number] | null
    locale?: string
    signal?: AbortSignal
  } = {}
): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: "6" })

  // Rank results close to the user (or the current marker) first.
  if (near) {
    params.set("lon", String(near[0]))
    params.set("lat", String(near[1]))
  }

  if (locale && PHOTON_LANGUAGES.includes(locale)) {
    params.set("lang", locale)
  }

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`Photon ${response.status}`)
  }

  const { features } = (await response.json()) as {
    features: PhotonFeature[]
  }

  return features.map(toPlace)
}

// The nearest address or place to a point, to name a location picked on the
// map. Null when Photon knows nothing there.
export async function reversePlace(
  coordinates: [number, number],
  { locale, signal }: { locale?: string; signal?: AbortSignal } = {}
): Promise<Place | null> {
  const params = new URLSearchParams({
    lon: String(coordinates[0]),
    lat: String(coordinates[1]),
    limit: "1",
  })

  if (locale && PHOTON_LANGUAGES.includes(locale)) {
    params.set("lang", locale)
  }

  const response = await fetch(`${PHOTON_REVERSE_URL}?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`Photon ${response.status}`)
  }

  const { features } = (await response.json()) as {
    features: PhotonFeature[]
  }

  return features[0] ? toPlace(features[0], 0) : null
}

function toPlace(
  { geometry, properties }: PhotonFeature,
  index: number
): Place {
  const street = [properties.street, properties.housenumber]
    .filter(Boolean)
    .join(" ")
  const name = properties.name ?? street
  const detail = [
    properties.name ? street : null,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ]
    // Photon repeats the same name across levels (district and city, often).
    .filter(
      (part, i, parts): part is string =>
        !!part && part !== name && parts.indexOf(part) === i
    )
    .join(", ")

  return {
    id: properties.osm_id
      ? `${properties.osm_type}${properties.osm_id}`
      : String(index),
    name: name || detail,
    detail: name ? detail : "",
    locality:
      properties.city ?? properties.district ?? properties.state ?? undefined,
    coordinates: geometry.coordinates,
  }
}
