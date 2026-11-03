"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

// MapLibre needs `window` and WebGL, so the map only renders on the client.
const GardenMap = dynamic(() => import("@/components/map/garden-map"), {
  ssr: false,
})

export function MapView() {
  return (
    // `isolate` keeps the map's markers and controls below overlays like the drawer.
    <div className="relative isolate size-full">
      {/* The focused garden comes from the URL query, only known in the
          browser for this statically exported page. */}
      <React.Suspense>
        <FocusedGardenMap />
      </React.Suspense>
    </div>
  )
}

function FocusedGardenMap() {
  const searchParams = useSearchParams()
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  const gardenId = searchParams.get("garden")
  const hasFocus =
    searchParams.has("lat") &&
    searchParams.has("lng") &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)

  const focus = React.useMemo(
    () => (hasFocus ? { lat, lng, gardenId } : null),
    [hasFocus, lat, lng, gardenId]
  )

  return <GardenMap focus={focus} />
}
