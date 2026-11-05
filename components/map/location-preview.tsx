"use client"

import * as React from "react"
import { Map as MapLibreMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/components/map/map.css"
import "@/components/map/worker"
import { useTheme } from "next-themes"

import type { Coordinates } from "@/components/map/location-picker"
import { mapStyleUrl, transformMapStyle } from "@/components/map/map-style"
import { createMarkerElement, gardenIcon } from "@/components/map/marker-icon"

const ZOOM = 14

// A still map of where a garden is, to recognize the spot at a glance. It
// takes no input: whatever contains it handles the taps.
export default function LocationPreview({
  coordinates,
}: {
  coordinates: Coordinates
}) {
  const { resolvedTheme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<MapLibreMap | null>(null)
  const markerRef = React.useRef<Marker | null>(null)
  // Read once on mount: later values move the map through the effects below.
  const initial = React.useRef({ coordinates, theme: resolvedTheme })

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const { coordinates, theme } = initial.current
    const map = new MapLibreMap({
      container: containerRef.current,
      center: coordinates,
      zoom: ZOOM,
      interactive: false,
      attributionControl: { compact: true },
    })
    map.setStyle(mapStyleUrl(theme), {
      transformStyle: transformMapStyle(theme, { buildings: false }),
    })
    markerRef.current = new Marker({
      element: createMarkerElement(gardenIcon({})),
    })
      .setLngLat(coordinates)
      .addTo(map)
    mapRef.current = map

    // MapLibre opens the compact attribution on load, covering most of a
    // map this small: start with just its button.
    map.once("load", () =>
      map
        .getContainer()
        .querySelector(".maplibregl-compact-show")
        ?.classList.remove("maplibregl-compact-show")
    )

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    mapRef.current?.jumpTo({ center: coordinates })
    markerRef.current?.setLngLat(coordinates)
  }, [coordinates])

  React.useEffect(() => {
    const map = mapRef.current

    // The style set on mount already follows the initial theme.
    if (!map || resolvedTheme === initial.current.theme) {
      return
    }

    initial.current.theme = resolvedTheme
    map.setStyle(mapStyleUrl(resolvedTheme), {
      transformStyle: transformMapStyle(resolvedTheme, { buildings: false }),
    })
  }, [resolvedTheme])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none isolate h-32 w-full overflow-hidden rounded-md"
    />
  )
}
