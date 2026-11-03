"use client"

import * as React from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { useMyGardens } from "@/components/my-gardens-provider"
import { useSearch } from "@/components/search-provider"
import { GardenDrawer } from "@/components/map/garden-drawer"
import { markerIcon } from "@/components/map/marker-icon"
import { getGardensFromBounds } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

// Fallback view when geolocation is unavailable or denied.
const DEFAULT_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 16

export interface MapFocus {
  lat: number
  lng: number
  // Opened in the drawer once its marker loads.
  gardenId: string | null
}

export default function GardenMap({ focus }: { focus: MapFocus | null }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null)
  const pendingGardenIdRef = React.useRef<string | null>(null)
  // Read once on mount: later focus changes arrive through the effect below.
  const initialFocus = React.useRef(focus)
  const [bounds, setBounds] = React.useState<L.LatLngBounds | null>(null)
  const [selectedGarden, setSelectedGarden] = React.useState<Garden | null>(
    null
  )
  const { searchText } = useSearch()
  // Refetch the markers when the user creates, edits or deletes a garden.
  const { gardens: myGardens } = useMyGardens()

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 16,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    layerGroupRef.current = L.layerGroup().addTo(map)

    map.on("moveend", () => setBounds(map.getBounds()))

    // The container resizes when the sidebar opens or collapses.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    // The position can arrive after unmount (e.g. Strict Mode remounting the
    // effect), when the map has already been removed.
    let removed = false

    // A focused garden wins over the user's position.
    navigator.geolocation?.getCurrentPosition((position) => {
      if (removed || initialFocus.current) {
        return
      }

      map.setView(
        [position.coords.latitude, position.coords.longitude],
        LOCATED_ZOOM
      )
    })

    return () => {
      removed = true
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (!focus || !mapRef.current) {
      return
    }

    pendingGardenIdRef.current = focus.gardenId
    mapRef.current.setView([focus.lat, focus.lng], LOCATED_ZOOM)
  }, [focus])

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

        const pending = gardens.find(
          (garden) => garden.id === pendingGardenIdRef.current
        )
        if (pending) {
          pendingGardenIdRef.current = null
          setSelectedGarden(pending)
        }

        gardens.forEach((garden) => {
          const [lng, lat] = garden.location.coordinates

          L.marker([lat, lng], { icon: markerIcon, title: garden.name })
            .on("click", () => setSelectedGarden(garden))
            .addTo(layerGroup)
        })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error)
        }
      })

    return () => controller.abort()
  }, [bounds, searchText, myGardens])

  return (
    <>
      <div ref={containerRef} className="size-full" />
      <GardenDrawer
        garden={selectedGarden}
        onClose={() => setSelectedGarden(null)}
      />
    </>
  )
}
