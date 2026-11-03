"use client"

import dynamic from "next/dynamic"

// Leaflet touches `window` on import, so the map only renders on the client.
const GardenMap = dynamic(() => import("@/components/map/garden-map"), {
  ssr: false,
})

export function MapView() {
  return (
    // `isolate` keeps Leaflet's high z-index panes below overlays like the sheet.
    <div className="relative isolate size-full">
      <GardenMap />
    </div>
  )
}
