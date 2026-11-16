"use client"

import * as React from "react"

import { fetchApproximateCenter } from "@/components/map/initial-view"

// The visitor's approximate [lng, lat] from their IP address (`/api/geo`),
// without asking for the browser's geolocation. Null until it arrives, and
// when it is unknown.
export function useApproximateCenter() {
  const [center, setCenter] = React.useState<[number, number] | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()

    fetchApproximateCenter(controller.signal).then((center) => {
      if (!controller.signal.aborted) {
        setCenter(center)
      }
    })

    return () => controller.abort()
  }, [])

  return center
}
