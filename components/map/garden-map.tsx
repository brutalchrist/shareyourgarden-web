"use client"

import * as React from "react"
import { Map as MapLibreMap, Marker, type LngLatBounds } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/components/map/map.css"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import Supercluster from "supercluster"

import { useMyGardens } from "@/components/my-gardens-provider"
import { GardenDrawer } from "@/components/map/garden-drawer"
import { MapControls } from "@/components/map/map-controls"
import { mapStyleUrl, transformMapStyle } from "@/components/map/map-style"
import {
  clusterIcon,
  createMarkerElement,
  gardenIcon,
  gardenIconKey,
  setMarkerContent,
  userLocationIcon,
  type GardenIconOptions,
  type MarkerContent,
} from "@/components/map/marker-icon"
import type { MapFilter } from "@/components/map/map-view"
import { useIsMobile } from "@/hooks/use-mobile"
import { getGardensFromBounds } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

// Fallback view when geolocation is unavailable or denied.
const DEFAULT_CENTER: [number, number] = [0, 0]
const DEFAULT_ZOOM = 1
const LOCATED_ZOOM = 15
const MAX_ZOOM = 15
// From this zoom on, pins become chips with the garden's name.
const CHIP_ZOOM = 14
// A slight tilt shows the 3D buildings without hiding the gardens.
const PITCH = 30
// Clustering radius in pixels: chips are wider than pins.
const PIN_CLUSTER_RADIUS = 60
const CHIP_CLUSTER_RADIUS = 110
// Gardens on the same spot, fanned out around their cluster.
const SPIDER_RADIUS = 48
// The room the drawer takes on larger screens, in rem: its width plus the
// inset on both sides (see GardenDrawer).
const DRAWER_WIDTH_REM = 27.5

export interface MapFocus {
  lat: number
  lng: number
  // Opened in the drawer once its marker loads.
  gardenId: string | null
}

interface GardenPoint {
  id: string
}

type GardenIndex = Supercluster<GardenPoint>

interface MarkerEntry {
  marker: Marker
  element: HTMLElement
  // Of the content the marker shows, to skip rebuilding an unchanged one.
  contentKey: string
  // Swapped on every render: the element's listeners call whatever is here.
  activate: () => void
}

export default function GardenMap({
  focus,
  filter: { searchText, productType },
  onEmptyChange,
}: {
  focus: MapFocus | null
  filter: MapFilter
  // Whether the gardens in view, once filtered, are none.
  onEmptyChange: (isEmpty: boolean) => void
}) {
  const t = useTranslations("MapControls")
  const tMap = useTranslations("GardenMap")
  const isMobile = useIsMobile()
  const { resolvedTheme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<MapLibreMap | null>(null)
  const gardensRef = React.useRef(new Map<string, Garden>())
  const indexesRef = React.useRef<{ pins: GardenIndex; chips: GardenIndex }>(
    null
  )
  const markersRef = React.useRef(new Map<string, MarkerEntry>())
  const selectedIdRef = React.useRef<string | null>(null)
  const ownIdsRef = React.useRef(new Set<string>())
  // The gardens fanned out from a cluster that can't be split by zooming.
  const spiderRef = React.useRef<Set<string> | null>(null)
  const userMarkerRef = React.useRef<Marker | null>(null)
  // For marker handlers to redraw, set once renderMarkers exists below.
  const renderMarkersRef = React.useRef(() => {})
  const pendingGardenIdRef = React.useRef<string | null>(null)
  // Read once on mount: later focus changes arrive through the effect below.
  const initialFocus = React.useRef(focus)
  // Read once on mount: later changes restyle the map through the effect below.
  const initialTheme = React.useRef(resolvedTheme)
  const [bounds, setBounds] = React.useState<LngLatBounds | null>(null)
  const [selectedGarden, setSelectedGarden] = React.useState<Garden | null>(
    null
  )
  const [locating, setLocating] = React.useState(false)
  // Read by renderMarkers, so a filtered garden shows the filtered type.
  const productTypeRef = React.useRef(productType)
  // Refetch the markers when the user creates, edits or deletes a garden.
  const { gardens: myGardens } = useMyGardens()

  const gardenLabel = React.useCallback(
    (garden: Garden) =>
      `${garden.name} · ${tMap("productCount", { count: garden.products.length })}`,
    [tMap]
  )

  // Draws the gardens and clusters in view, reusing the markers already there.
  const renderMarkers = React.useCallback(() => {
    const map = mapRef.current
    const indexes = indexesRef.current

    if (!map || !indexes) {
      return
    }

    const zoom = map.getZoom()
    const chip = zoom >= CHIP_ZOOM
    const index = chip ? indexes.chips : indexes.pins
    const bounds = map.getBounds()
    const features = index.getClusters(
      [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ],
      Math.floor(zoom)
    )
    const markers = markersRef.current
    const seen = new Set<string>()

    function place(
      key: string,
      lngLat: [number, number],
      content: MarkerContent,
      contentKey: string,
      { label, raised, offset, activate }: MarkerPlacement
    ) {
      seen.add(key)
      let entry = markers.get(key)

      if (!entry) {
        const element = createMarkerElement(content)
        element.setAttribute("role", "button")
        element.tabIndex = 0
        const created: MarkerEntry = {
          element,
          contentKey,
          activate,
          marker: new Marker({ element }).setLngLat(lngLat).addTo(map!),
        }
        element.addEventListener("click", (event) => {
          event.stopPropagation()
          created.activate()
        })
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            created.activate()
          }
        })
        markers.set(key, created)
        entry = created
      } else {
        entry.marker.setLngLat(lngLat)
        entry.activate = activate

        if (entry.contentKey !== contentKey) {
          entry.contentKey = contentKey
          setMarkerContent(entry.element, content)
        }
      }

      entry.marker.setOffset(offset ?? [0, 0])
      entry.element.setAttribute("aria-label", label)
      entry.element.title = label
      entry.element.style.zIndex = raised ? "1" : ""
    }

    function placeGarden(id: string, offset?: [number, number]) {
      const garden = gardensRef.current.get(id)

      if (!garden) {
        return
      }

      const options: GardenIconOptions = {
        // The type filtered by stands for the garden, else its first product.
        type: productTypeRef.current ?? garden.products[0]?.type,
        own: ownIdsRef.current.has(id),
        selected: id === selectedIdRef.current,
        chip: chip
          ? { name: garden.name, count: garden.products.length }
          : undefined,
      }

      place(
        `garden:${id}`,
        garden.location.coordinates,
        gardenIcon(options),
        gardenIconKey(options),
        {
          label: gardenLabel(garden),
          raised: options.selected,
          offset,
          activate: () => setSelectedGarden(garden),
        }
      )
    }

    for (const feature of features) {
      const [lng, lat] = feature.geometry.coordinates

      if (!("cluster" in feature.properties)) {
        placeGarden(feature.properties.id)
        continue
      }

      const { cluster_id: clusterId, point_count: count } = feature.properties
      const leaves = index
        .getLeaves(clusterId, Infinity)
        .map((leaf) => leaf.properties.id)
      const spider = spiderRef.current

      if (spider && leaves.some((id) => spider.has(id))) {
        leaves.forEach((id, i) => {
          const angle = (2 * Math.PI * i) / leaves.length - Math.PI / 2
          const radius = SPIDER_RADIUS + leaves.length * 4
          placeGarden(id, [Math.cos(angle) * radius, Math.sin(angle) * radius])
        })
        continue
      }

      place(
        `cluster:${leaves.join(",")}`,
        [lng, lat],
        clusterIcon(count),
        String(count),
        {
          label: tMap("clusterLabel", { count }),
          activate: () => {
            const expansionZoom = index.getClusterExpansionZoom(clusterId)

            if (expansionZoom <= MAX_ZOOM) {
              map.easeTo({ center: [lng, lat], zoom: expansionZoom })
            } else {
              // Zooming in won't split them: fan them out instead.
              spiderRef.current = new Set(leaves)
              renderMarkersRef.current()
            }
          },
        }
      )
    }

    markers.forEach((entry, key) => {
      if (!seen.has(key)) {
        entry.marker.remove()
        markers.delete(key)
      }
    })
  }, [gardenLabel, tMap])

  React.useEffect(() => {
    renderMarkersRef.current = renderMarkers
  }, [renderMarkers])

  const showUserLocation = React.useCallback((lngLat: [number, number]) => {
    const map = mapRef.current

    if (!map) {
      return
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(lngLat)
    } else {
      const element = createMarkerElement(userLocationIcon)
      element.style.cursor = "default"
      userMarkerRef.current = new Marker({ element })
        .setLngLat(lngLat)
        .addTo(map)
    }
  }, [])

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: MAX_ZOOM,
      pitch: PITCH,
      // North stays up: rotating a map of nearby gardens only disorients.
      dragRotate: false,
      attributionControl: { compact: false },
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.setStyle(mapStyleUrl(initialTheme.current), {
      transformStyle: transformMapStyle(initialTheme.current, {
        buildings: true,
      }),
    })
    mapRef.current = map

    const markers = markersRef.current

    map.on("moveend", () => {
      setBounds(map.getBounds())
      renderMarkers()
    })
    // A zoom change regroups the clusters: fold any fanned-out one back.
    map.on("zoomstart", () => {
      spiderRef.current = null
    })
    // So does a click on the map itself (markers stop their own clicks).
    map.on("click", () => {
      if (spiderRef.current) {
        spiderRef.current = null
        renderMarkers()
      }
    })
    // Load the gardens of the starting view too, even if it never moves.
    map.once("load", () => setBounds(map.getBounds()))

    // The container resizes when the sidebar opens or collapses.
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    // The position can arrive after unmount (e.g. Strict Mode remounting the
    // effect), when the map has already been removed.
    let removed = false

    // Start at the user's position only if they already allowed it: a
    // permission prompt on arrival, before they know why, is mostly refused.
    // Otherwise the locate button asks.
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (removed || status.state !== "granted") {
          return
        }

        navigator.geolocation.getCurrentPosition((position) => {
          if (removed) {
            return
          }

          const lngLat: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ]
          showUserLocation(lngLat)

          // A focused garden wins over the user's position.
          if (!initialFocus.current) {
            map.jumpTo({ center: lngLat, zoom: LOCATED_ZOOM })
          }
        })
      })
      .catch(() => {})

    return () => {
      removed = true
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      userMarkerRef.current = null
      markers.clear()
    }
  }, [renderMarkers, showUserLocation])

  React.useEffect(() => {
    const map = mapRef.current

    // The style set on mount already follows the initial theme.
    if (!map || resolvedTheme === initialTheme.current) {
      return
    }

    initialTheme.current = resolvedTheme
    map.setStyle(mapStyleUrl(resolvedTheme), {
      transformStyle: transformMapStyle(resolvedTheme, { buildings: true }),
    })
  }, [resolvedTheme])

  React.useEffect(() => {
    if (!focus || !mapRef.current) {
      return
    }

    pendingGardenIdRef.current = focus.gardenId
    mapRef.current.jumpTo({
      center: [focus.lng, focus.lat],
      zoom: LOCATED_ZOOM,
    })
  }, [focus])

  React.useEffect(() => {
    ownIdsRef.current = new Set(myGardens.map((garden) => garden.id))
    renderMarkers()
  }, [myGardens, renderMarkers])

  React.useEffect(() => {
    selectedIdRef.current = selectedGarden?.id ?? null
    renderMarkers()
  }, [selectedGarden, renderMarkers])

  // Bring the selected garden into the part of the map the drawer leaves
  // visible: left of the side panel, or above the bottom sheet on mobile.
  React.useEffect(() => {
    const map = mapRef.current

    if (!map || !selectedGarden) {
      return
    }

    const width = map.getContainer().clientWidth
    const height = map.getContainer().clientHeight
    let offset: [number, number] = [0, -height / 4]

    if (!isMobile) {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const drawerWidth = DRAWER_WIDTH_REM * rem
      // Without room left of the drawer, center it as usual.
      offset = [drawerWidth < width ? -drawerWidth / 2 : 0, 0]
    }

    map.easeTo({
      center: selectedGarden.location.coordinates,
      offset,
      duration: 500,
    })
  }, [selectedGarden, isMobile])

  React.useEffect(() => {
    if (!bounds) {
      return
    }

    const controller = new AbortController()

    getGardensFromBounds(bounds, searchText, controller.signal)
      .then((found) => {
        productTypeRef.current = productType
        // The backend searches by text only: the type is filtered here.
        const gardens = productType
          ? found.filter((garden) =>
              garden.products.some((product) => product.type === productType)
            )
          : found
        onEmptyChange(gardens.length === 0)

        const pending = gardens.find(
          (garden) => garden.id === pendingGardenIdRef.current
        )
        if (pending) {
          pendingGardenIdRef.current = null
          setSelectedGarden(pending)
        }

        gardensRef.current = new Map(
          gardens.map((garden) => [garden.id, garden])
        )

        const points = gardens.map(
          (garden): Supercluster.PointFeature<GardenPoint> => ({
            type: "Feature",
            properties: { id: garden.id },
            geometry: {
              type: "Point",
              coordinates: garden.location.coordinates,
            },
          })
        )
        // Clustered up to the last zoom level: gardens still grouped there
        // fan out on click.
        indexesRef.current = {
          pins: new Supercluster<GardenPoint>({
            radius: PIN_CLUSTER_RADIUS,
            maxZoom: MAX_ZOOM,
          }).load(points),
          chips: new Supercluster<GardenPoint>({
            radius: CHIP_CLUSTER_RADIUS,
            maxZoom: MAX_ZOOM,
          }).load(points),
        }

        renderMarkers()
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error)
        }
      })

    return () => controller.abort()
  }, [bounds, searchText, productType, myGardens, renderMarkers, onEmptyChange])

  function locate() {
    if (!navigator.geolocation) {
      toast.error(t("locateError"))
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const lngLat: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ]
        showUserLocation(lngLat)
        mapRef.current?.flyTo({
          center: lngLat,
          zoom: LOCATED_ZOOM,
          duration: 800,
        })
      },
      () => {
        setLocating(false)
        toast.error(t("locateError"))
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  return (
    <>
      <div ref={containerRef} className="size-full" />
      <MapControls
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onLocate={locate}
        locating={locating}
      />
      <GardenDrawer
        garden={selectedGarden}
        onClose={() => setSelectedGarden(null)}
      />
    </>
  )
}

interface MarkerPlacement {
  label: string
  // Drawn above its neighbours.
  raised?: boolean
  // In pixels from the point, for gardens fanned out of a cluster.
  offset?: [number, number]
  activate: () => void
}
