"use client"

import * as React from "react"
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/components/map/map.css"
import "@/components/map/worker"
import { useTheme } from "next-themes"

import { mapStyleUrl, transformMapStyle } from "@/components/map/map-style"
import { createMarkerElement, gardenIcon } from "@/components/map/marker-icon"

const DEFAULT_CENTER: Coordinates = [0, 0]
const DEFAULT_ZOOM = 1
const PICKED_ZOOM = 15
const MAX_ZOOM = 17

// [lng, lat], as GeoJSON stores it.
export type Coordinates = [number, number]

export default function LocationPicker({
  value,
  onChange,
  invalid,
}: {
  value: Coordinates | null
  onChange: (value: Coordinates) => void
  invalid?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<MapLibreMap | null>(null)
  const markerRef = React.useRef<Marker | null>(null)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })

  // Read once on mount: later values arrive through the effect below.
  const initialValue = React.useRef(value)
  // Read once on mount: later changes restyle the map through the effect below.
  const initialTheme = React.useRef(resolvedTheme)

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const initial = initialValue.current
    // Flat and without 3D buildings: picking a spot needs a plain top view.
    const map = new MapLibreMap({
      container: containerRef.current,
      center: initial ?? DEFAULT_CENTER,
      zoom: initial ? PICKED_ZOOM : DEFAULT_ZOOM,
      maxZoom: MAX_ZOOM,
      // The picker sits in a scrolling form: the wheel scrolls the page, the
      // zoom buttons and pinch still zoom the map.
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.setStyle(mapStyleUrl(initialTheme.current), {
      transformStyle: transformMapStyle(initialTheme.current, {
        buildings: false,
      }),
    })
    map.addControl(new NavigationControl({ showCompass: false }), "top-left")
    mapRef.current = map

    map.on("click", (event) => {
      onChangeRef.current([event.lngLat.lng, event.lngLat.lat])

      // A click on a zoomed-out map is only a rough guess: zoom in on it so
      // the marker can be dragged to the exact spot.
      if (map.getZoom() < PICKED_ZOOM - 4) {
        map.jumpTo({ center: event.lngLat, zoom: PICKED_ZOOM - 2 })
      }
    })

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    let removed = false

    // Without a location yet, start near the user so picking is a short pan.
    if (!initial) {
      navigator.geolocation?.getCurrentPosition((position) => {
        if (removed || markerRef.current) {
          return
        }

        map.jumpTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: PICKED_ZOOM - 2,
        })
      })
    }

    return () => {
      removed = true
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const map = mapRef.current

    // The style set on mount already follows the initial theme.
    if (!map || resolvedTheme === initialTheme.current) {
      return
    }

    initialTheme.current = resolvedTheme
    map.setStyle(mapStyleUrl(resolvedTheme), {
      transformStyle: transformMapStyle(resolvedTheme, { buildings: false }),
    })
  }, [resolvedTheme])

  React.useEffect(() => {
    const map = mapRef.current

    if (!map || !value) {
      return
    }

    if (markerRef.current) {
      markerRef.current.setLngLat(value)
    } else {
      const element = createMarkerElement(gardenIcon({}))
      element.style.cursor = "grab"
      const marker = new Marker({ element, draggable: true }).setLngLat(value)
      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat()
        onChangeRef.current([lng, lat])
      })
      markerRef.current = marker.addTo(map)
    }

    // Values from outside the map (the address search, geolocation) may land
    // off-screen or on a zoomed-out view: bring them close enough to adjust.
    if (!map.getBounds().contains(value) || map.getZoom() < PICKED_ZOOM - 4) {
      map.jumpTo({ center: value, zoom: Math.max(map.getZoom(), PICKED_ZOOM) })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      aria-invalid={invalid || undefined}
      className="isolate h-72 w-full overflow-hidden rounded-md border border-input aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:h-80"
    />
  )
}
