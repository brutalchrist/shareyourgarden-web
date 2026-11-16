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
  // The house number searched for when this is only its street: OpenStreetMap
  // lacks many house numbers (most of Chile outside Santiago), so the marker
  // lands somewhere on the street and needs moving to the house.
  missingNumber?: string
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    // The OpenStreetMap tag key: "highway" for streets and roads.
    osm_key?: string
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    state?: string
    country?: string
  }
}

const SEARCH_LIMIT = 6

// Street types people write before the name, left out when comparing names.
const STREET_TYPES = new Set([
  "av",
  "avda",
  "avenida",
  "calle",
  "camino",
  "pasaje",
  "pje",
  "psje",
  "ruta",
])

interface SearchOptions {
  near?: [number, number] | null
  // How far the `near` bias reaches, as a map zoom: Photon's default (16)
  // favours the surrounding streets, lower values a whole city or region.
  nearZoom?: number
  locale?: string
  signal?: AbortSignal
}

export async function searchPlaces(
  rawQuery: string,
  options: SearchOptions = {}
): Promise<Place[]> {
  const query = expandAbbreviations(rawQuery)
  const address = splitHouseNumber(query)

  if (!address) {
    return (await photonSearch(query, options)).map(toPlace)
  }

  // Photon ranks a matching house number above the street name, so "3 Oriente
  // 241" brings back every "… Oriente 241" in the world before the street in
  // the visitor's city, which has no numbers mapped. Search the street on its
  // own too, and keep only the houses on a street with the name searched.
  // Either list is useful alone: fail only when both searches do.
  const [housesResult, streetsResult] = await Promise.allSettled([
    photonSearch(query, options),
    photonSearch(address.streetQuery, options),
  ])
  if (
    housesResult.status === "rejected" &&
    streetsResult.status === "rejected"
  ) {
    throw housesResult.reason
  }
  const houses = housesResult.status === "fulfilled" ? housesResult.value : []
  const streets =
    streetsResult.status === "fulfilled" ? streetsResult.value : []
  const onStreet = houses.filter((feature) =>
    sameStreet(feature, address.street)
  )
  const exact = onStreet.filter(
    (feature) =>
      normalize(feature.properties.housenumber ?? "") ===
      normalize(address.number)
  )

  // The street itself, not a bus stop or a park sharing its name. Whatever
  // else the street search found (a typo's closest match) goes last.
  const isStreet = (feature: PhotonFeature) =>
    feature.properties.osm_key === "highway" &&
    !feature.properties.housenumber &&
    sameStreet(feature, address.street)

  const seen = new Set<string>()
  return [
    ...exact.map(toPlace),
    ...streets.filter(isStreet).map((feature, index) => ({
      ...toPlace(feature, index),
      missingNumber: address.number,
    })),
    ...onStreet.map(toPlace),
    ...streets.filter((feature) => !isStreet(feature)).map(toPlace),
  ]
    .filter((place) => !seen.has(place.id) && !!seen.add(place.id))
    .slice(0, SEARCH_LIMIT)
}

async function photonSearch(
  query: string,
  { near, nearZoom, locale, signal }: SearchOptions
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({ q: query, limit: String(SEARCH_LIMIT) })

  // Rank results close to the user (or the current marker) first. Only a
  // ranking: results elsewhere still come back when they match better.
  if (near) {
    params.set("lon", String(near[0]))
    params.set("lat", String(near[1]))

    if (nearZoom !== undefined) {
      params.set("zoom", String(nearZoom))
    }
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

  return features
}

// OpenStreetMap writes street types in full, and Photon doesn't match "Avda."
// with "Avenida".
const ABBREVIATIONS: [RegExp, string][] = [
  [/\b(?:avda|av)\b\.?/giu, "Avenida"],
  [/\b(?:pje|psje)\b\.?/giu, "Pasaje"],
]

function expandAbbreviations(query: string) {
  return ABBREVIATIONS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    query
  )
}

// "3 Oriente 241, Talca" as its street ("3 Oriente"), house number ("241")
// and the query without the number. Null without a trailing number, or when
// the number is the street's whole name ("Calle 10").
export function splitHouseNumber(query: string) {
  const [head, ...rest] = query.split(",")
  const match = head
    .trim()
    .match(/^(.*?\S)\s+(?:#\s*|n[°º.]?\s*)?(\d+[a-z]?)$/i)

  if (!match || words(match[1]).length === 0) {
    return null
  }

  const [, street, number] = match
  return {
    street,
    number,
    streetQuery: [street, ...rest].join(","),
  }
}

function sameStreet({ properties }: PhotonFeature, street: string) {
  const name = new Set(words(properties.street ?? properties.name ?? ""))
  return words(street).every((word) => name.has(word))
}

// The words of a street name that tell it apart, without accents, case or
// street type: "Avda. Providencia" and "avenida providencia" both give
// ["providencia"].
function words(name: string) {
  return normalize(name)
    .split(/[^\p{L}\p{N}½]+/u)
    .filter((word) => word && !STREET_TYPES.has(word))
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
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
