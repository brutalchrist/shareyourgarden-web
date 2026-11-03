"use client"

import * as React from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "@/components/map/map.css"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useMyGardens } from "@/components/my-gardens-provider"
import { useSearch } from "@/components/search-provider"
import { createBaseLayer } from "@/components/map/base-layer"
import { GardenDrawer } from "@/components/map/garden-drawer"
import { MapControls } from "@/components/map/map-controls"
import {
  markerIcon,
  ownMarkerIcon,
  userLocationIcon,
} from "@/components/map/marker-icon"
import { getGardensFromBounds } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

// Fallback view when geolocation is unavailable or denied.
const DEFAULT_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 16
const MAX_ZOOM = 16
// Keeps the selected pin above its neighbours.
const SELECTED_Z_OFFSET = 1000

export interface MapFocus {
  lat: number
  lng: number
  // Opened in the drawer once its marker loads.
  gardenId: string | null
}

export default function GardenMap({ focus }: { focus: MapFocus | null }) {
  const t = useTranslations("MapControls")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null)
  const markersRef = React.useRef(new Map<string, L.Marker>())
  const userMarkerRef = React.useRef<L.Marker | null>(null)
  const pendingGardenIdRef = React.useRef<string | null>(null)
  // Read once on mount: later focus changes arrive through the effect below.
  const initialFocus = React.useRef(focus)
  const [bounds, setBounds] = React.useState<L.LatLngBounds | null>(null)
  const [selectedGarden, setSelectedGarden] = React.useState<Garden | null>(
    null
  )
  const [locating, setLocating] = React.useState(false)
  const { searchText } = useSearch()
  // Refetch the markers when the user creates, edits or deletes a garden.
  const { gardens: myGardens } = useMyGardens()
  // Markers are rebuilt on every fetch: they read the selection from here.
  const selectedIdRef = React.useRef<string | null>(null)

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

    layerGroupRef.current = L.layerGroup().addTo(map)

    map.on("moveend", () => setBounds(map.getBounds()))

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

    const markers = markersRef.current

    return () => {
      removed = true
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
      userMarkerRef.current = null
      markers.clear()
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
    const previousId = selectedIdRef.current
    const selectedId = selectedGarden?.id ?? null
    selectedIdRef.current = selectedId

    if (previousId) {
      setMarkerSelected(markersRef.current.get(previousId), false)
    }
    if (selectedId) {
      setMarkerSelected(markersRef.current.get(selectedId), true)
    }
  }, [selectedGarden])

  React.useEffect(() => {
    if (!bounds) {
      return
    }

    const controller = new AbortController()

    getGardensFromBounds(bounds, searchText, controller.signal)
      .then((gardens) => {
        const layerGroup = layerGroupRef.current

        if (!layerGroup) {
          return
        }

        layerGroup.clearLayers()
        markersRef.current.clear()

        const pending = gardens.find(
          (garden) => garden.id === pendingGardenIdRef.current
        )
        if (pending) {
          pendingGardenIdRef.current = null
          setSelectedGarden(pending)
        }

        const myGardenIds = new Set(myGardens.map((garden) => garden.id))

        gardens.forEach((garden) => {
          const [lng, lat] = garden.location.coordinates

          const marker = L.marker([lat, lng], {
            icon: myGardenIds.has(garden.id) ? ownMarkerIcon : markerIcon,
            title: garden.name,
            alt: garden.name,
          })
            .on("click", () => setSelectedGarden(garden))
            .addTo(layerGroup)

          markersRef.current.set(garden.id, marker)
          if (garden.id === selectedIdRef.current) {
            setMarkerSelected(marker, true)
          }
        })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error)
        }
      })

    return () => controller.abort()
  }, [bounds, searchText, myGardens])

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

function setMarkerSelected(marker: L.Marker | undefined, selected: boolean) {
  if (!marker) {
    return
  }

  marker.getElement()?.classList.toggle("is-selected", selected)
  marker.setZIndexOffset(selected ? SELECTED_Z_OFFSET : 0)
}
