"use client"

import * as React from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { useSearch } from "@/components/search-provider"
import { GardenSheet } from "@/components/map/garden-sheet"
import { getGardensFromBounds } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

// Fallback view when geolocation is unavailable or denied.
const DEFAULT_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 16

const markerIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

export default function GardenMap() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null)
  const [bounds, setBounds] = React.useState<L.LatLngBounds | null>(null)
  const [selectedGarden, setSelectedGarden] = React.useState<Garden | null>(
    null
  )
  const { searchText } = useSearch()

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })

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

    navigator.geolocation?.getCurrentPosition((position) => {
      if (removed) {
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
      layerGroupRef.current = null
    }
  }, [])

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
  }, [bounds, searchText])

  return (
    <>
      <div ref={containerRef} className="size-full" />
      <GardenSheet
        garden={selectedGarden}
        onClose={() => setSelectedGarden(null)}
      />
    </>
  )
}
