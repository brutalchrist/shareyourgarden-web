"use client"

import * as React from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { markerIcon } from "@/components/map/marker-icon"

const DEFAULT_CENTER: L.LatLngTuple = [0, 0]
const DEFAULT_ZOOM = 2
const PICKED_ZOOM = 16

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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const markerRef = React.useRef<L.Marker | null>(null)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })

  // Read once on mount: later values arrive through the effect below.
  const initialValue = React.useRef(value)

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const initial = initialValue.current
    const map = L.map(containerRef.current, {
      center: initial ? [initial[1], initial[0]] : DEFAULT_CENTER,
      zoom: initial ? PICKED_ZOOM : DEFAULT_ZOOM,
      // The picker sits in a scrolling form: the wheel scrolls the page, the
      // zoom buttons and pinch still zoom the map.
      scrollWheelZoom: false,
    })
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    map.on("click", (event: L.LeafletMouseEvent) => {
      onChangeRef.current([event.latlng.lng, event.latlng.lat])

      // A click on a zoomed-out map is only a rough guess: zoom in on it so
      // the marker can be dragged to the exact spot.
      if (map.getZoom() < PICKED_ZOOM - 4) {
        map.setView(event.latlng, PICKED_ZOOM - 2)
      }
    })

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    let removed = false

    // Without a location yet, start near the user so picking is a short pan.
    if (!initial) {
      navigator.geolocation?.getCurrentPosition((position) => {
        if (removed || markerRef.current) {
          return
        }

        map.setView(
          [position.coords.latitude, position.coords.longitude],
          PICKED_ZOOM - 2
        )
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

    if (!map || !value) {
      return
    }

    const latLng: L.LatLngTuple = [value[1], value[0]]

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng)
    } else {
      markerRef.current = L.marker(latLng, {
        icon: markerIcon,
        draggable: true,
        autoPan: true,
      })
        .on("dragend", (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng()
          onChangeRef.current([lng, lat])
        })
        .addTo(map)
    }

    // Values from outside the map (the address search, geolocation) may land
    // off-screen or on a zoomed-out view: bring them close enough to adjust.
    if (!map.getBounds().contains(latLng) || map.getZoom() < PICKED_ZOOM - 4) {
      map.setView(latLng, Math.max(map.getZoom(), PICKED_ZOOM))
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
