"use client"

import * as React from "react"
import L from "leaflet"
// Extends the `L` global that Leaflet sets, so it must come after it.
import "leaflet.markercluster"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "@/components/map/map.css"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useMyGardens } from "@/components/my-gardens-provider"
import { useSearch } from "@/components/search-provider"
import { createBaseLayer } from "@/components/map/base-layer"
import { GardenDrawer } from "@/components/map/garden-drawer"
import { MapControls } from "@/components/map/map-controls"
import { MapEmptyState } from "@/components/map/map-empty-state"
import {
  clusterIcon,
  gardenIcon,
  gardenIconKey,
  userLocationIcon,
  type GardenIconOptions,
} from "@/components/map/marker-icon"
import { useIsMobile } from "@/hooks/use-mobile"
import { getGardensFromBounds } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

// Fallback view when geolocation is unavailable or denied.
const DEFAULT_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 16
const MAX_ZOOM = 16
// From this zoom on, pins become chips with the garden's name.
const CHIP_ZOOM = 15
// Keeps the selected pin above its neighbours.
const SELECTED_Z_OFFSET = 1000
// The drawer's width on larger screens, in rem (see GardenDrawer).
const DRAWER_WIDTH_REM = 40

export interface MapFocus {
  lat: number
  lng: number
  // Opened in the drawer once its marker loads.
  gardenId: string | null
}

interface MarkerEntry {
  garden: Garden
  marker: L.Marker
  // Of the icon the marker shows, to skip rebuilding an unchanged one.
  iconKey: string
}

// What, besides the garden itself, decides how its marker looks.
interface MarkerView {
  selectedId: string | null
  chip: boolean
  ownIds: Set<string>
}

export default function GardenMap({ focus }: { focus: MapFocus | null }) {
  const t = useTranslations("MapControls")
  const tMap = useTranslations("GardenMap")
  const isMobile = useIsMobile()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const clusterGroupRef = React.useRef<L.MarkerClusterGroup | null>(null)
  const entriesRef = React.useRef(new Map<string, MarkerEntry>())
  const viewRef = React.useRef<MarkerView>({
    selectedId: null,
    chip: false,
    ownIds: new Set(),
  })
  const userMarkerRef = React.useRef<L.Marker | null>(null)
  const pendingGardenIdRef = React.useRef<string | null>(null)
  // Read once on mount: later focus changes arrive through the effect below.
  const initialFocus = React.useRef(focus)
  const [bounds, setBounds] = React.useState<L.LatLngBounds | null>(null)
  const [selectedGarden, setSelectedGarden] = React.useState<Garden | null>(
    null
  )
  const [isEmpty, setIsEmpty] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const { searchText } = useSearch()
  // Refetch the markers when the user creates, edits or deletes a garden.
  const { gardens: myGardens } = useMyGardens()

  // Marker titles are plain strings: build them here, where `t` is.
  const markerTitle = React.useCallback(
    (garden: Garden) =>
      `${garden.name} · ${tMap("productCount", { count: garden.products.length })}`,
    [tMap]
  )

  const showUserLocation = React.useCallback((latLng: L.LatLngTuple) => {
    const map = mapRef.current

    if (!map) {
      return
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng)
    } else {
      userMarkerRef.current = L.marker(latLng, {
        icon: userLocationIcon,
        interactive: false,
        keyboard: false,
      }).addTo(map)
    }
  }, [])

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      // Replaced by MapControls.
      zoomControl: false,
    })
    mapRef.current = map
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com">Leaflet</a>'
    )

    createBaseLayer(MAX_ZOOM).addTo(map)

    clusterGroupRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      // Chips are wider than pins: group them from further apart.
      maxClusterRadius: (zoom) => (zoom >= CHIP_ZOOM ? 110 : 60),
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
    }).addTo(map)

    const entries = entriesRef.current
    viewRef.current.chip = map.getZoom() >= CHIP_ZOOM

    map.on("moveend", () => setBounds(map.getBounds()))
    map.on("zoomend", () => {
      const chip = map.getZoom() >= CHIP_ZOOM

      if (chip !== viewRef.current.chip) {
        viewRef.current.chip = chip
        syncIcons(entries, viewRef.current)
      }
    })
    // Load the gardens of the starting view too, even if it never moves.
    map.whenReady(() => setBounds(map.getBounds()))

    // The container resizes when the sidebar opens or collapses.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    // The position can arrive after unmount (e.g. Strict Mode remounting the
    // effect), when the map has already been removed.
    let removed = false

    navigator.geolocation?.getCurrentPosition((position) => {
      if (removed) {
        return
      }

      const latLng: L.LatLngTuple = [
        position.coords.latitude,
        position.coords.longitude,
      ]
      showUserLocation(latLng)

      // A focused garden wins over the user's position.
      if (!initialFocus.current) {
        map.setView(latLng, LOCATED_ZOOM)
      }
    })

    return () => {
      removed = true
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      clusterGroupRef.current = null
      userMarkerRef.current = null
      entries.clear()
    }
  }, [showUserLocation])

  React.useEffect(() => {
    if (!focus || !mapRef.current) {
      return
    }

    pendingGardenIdRef.current = focus.gardenId
    mapRef.current.setView([focus.lat, focus.lng], LOCATED_ZOOM)
  }, [focus])

  React.useEffect(() => {
    viewRef.current.ownIds = new Set(myGardens.map((garden) => garden.id))
    syncIcons(entriesRef.current, viewRef.current)
  }, [myGardens])

  React.useEffect(() => {
    viewRef.current.selectedId = selectedGarden?.id ?? null
    syncIcons(entriesRef.current, viewRef.current)
  }, [selectedGarden])

  // Bring the selected garden into the part of the map the drawer leaves
  // visible: left of the side panel, or above the bottom sheet on mobile.
  React.useEffect(() => {
    const map = mapRef.current

    if (!map || !selectedGarden) {
      return
    }

    const [lng, lat] = selectedGarden.location.coordinates
    const size = map.getSize()
    let offset = L.point(0, size.y / 4)

    if (!isMobile) {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const drawerWidth = DRAWER_WIDTH_REM * rem
      // Without room left of the drawer, center it as usual.
      offset = L.point(drawerWidth < size.x ? drawerWidth / 2 : 0, 0)
    }

    const target = map.unproject(map.project([lat, lng]).add(offset))
    map.panTo(target, { animate: true, duration: 0.5 })
  }, [selectedGarden, isMobile])

  React.useEffect(() => {
    if (!bounds) {
      return
    }

    const controller = new AbortController()

    getGardensFromBounds(bounds, searchText, controller.signal)
      .then((gardens) => {
        const clusterGroup = clusterGroupRef.current

        if (!clusterGroup) {
          return
        }

        setIsEmpty(gardens.length === 0)

        const pending = gardens.find(
          (garden) => garden.id === pendingGardenIdRef.current
        )
        if (pending) {
          pendingGardenIdRef.current = null
          setSelectedGarden(pending)
        }

        // Update the markers in place rather than redrawing them all, so
        // panning doesn't make the clusters flicker.
        const entries = entriesRef.current
        const ids = new Set(gardens.map((garden) => garden.id))
        const removed: L.Marker[] = []
        const added: L.Marker[] = []

        entries.forEach((entry, id) => {
          if (!ids.has(id)) {
            removed.push(entry.marker)
            entries.delete(id)
          }
        })

        gardens.forEach((garden) => {
          const [lng, lat] = garden.location.coordinates
          const existing = entries.get(garden.id)

          if (existing) {
            existing.garden = garden
            existing.marker.options.title = markerTitle(garden)

            if (!existing.marker.getLatLng().equals([lat, lng])) {
              clusterGroup.removeLayer(existing.marker)
              existing.marker.setLatLng([lat, lng])
              clusterGroup.addLayer(existing.marker)
            }

            syncIcon(existing, viewRef.current)
            return
          }

          const entry: MarkerEntry = {
            garden,
            marker: L.marker([lat, lng], {
              title: markerTitle(garden),
              alt: garden.name,
            }),
            iconKey: "",
          }
          entry.marker.on("click", () => setSelectedGarden(entry.garden))
          syncIcon(entry, viewRef.current)
          entries.set(garden.id, entry)
          added.push(entry.marker)
        })

        clusterGroup.removeLayers(removed)
        clusterGroup.addLayers(added)
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error)
        }
      })

    return () => controller.abort()
  }, [bounds, searchText, myGardens, markerTitle])

  function locate() {
    if (!navigator.geolocation) {
      toast.error(t("locateError"))
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const latLng: L.LatLngTuple = [
          position.coords.latitude,
          position.coords.longitude,
        ]
        showUserLocation(latLng)
        mapRef.current?.flyTo(latLng, LOCATED_ZOOM, { duration: 0.8 })
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
      {isEmpty && <MapEmptyState searchText={searchText} />}
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

function iconOptions(garden: Garden, view: MarkerView): GardenIconOptions {
  return {
    // The first product stands for the garden.
    type: garden.products[0]?.type,
    own: view.ownIds.has(garden.id),
    selected: garden.id === view.selectedId,
    chip: view.chip
      ? { name: garden.name, count: garden.products.length }
      : undefined,
  }
}

function syncIcon(entry: MarkerEntry, view: MarkerView) {
  const options = iconOptions(entry.garden, view)
  const key = gardenIconKey(options)

  if (key === entry.iconKey) {
    return
  }

  entry.iconKey = key
  entry.marker.setIcon(gardenIcon(options))
  entry.marker.setZIndexOffset(options.selected ? SELECTED_Z_OFFSET : 0)
}

function syncIcons(entries: Map<string, MarkerEntry>, view: MarkerView) {
  entries.forEach((entry) => syncIcon(entry, view))
}
