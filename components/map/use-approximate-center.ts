"use client"

import * as React from "react"

import { fetchApproximateCenter } from "@/components/map/initial-view"

// A recent position is as good as a fresh one to know the visitor's city.
const POSITION_MAX_AGE_MS = 10 * 60 * 1000

// Roughly where the visitor is, as [lng, lat], without ever prompting: the
// browser's geolocation when they already allowed it, otherwise their IP
// address (`/api/geo`). The IP can be a city off (a private relay, a VPN or
// a mobile network exiting elsewhere), so the geolocation wins
// whenever it arrives. Null until one arrives, and when both are unknown.
export function useApproximateCenter() {
  const [center, setCenter] = React.useState<[number, number] | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    let precise = false

    fetchApproximateCenter(controller.signal).then((center) => {
      if (!controller.signal.aborted && !precise) {
        setCenter(center)
      }
    })

    isGeolocationGranted().then((granted) => {
      if (!granted || controller.signal.aborted) {
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (controller.signal.aborted) {
            return
          }

          precise = true
          setCenter([position.coords.longitude, position.coords.latitude])
        },
        // The IP address stands in.
        () => {},
        { maximumAge: POSITION_MAX_AGE_MS }
      )
    })

    return () => controller.abort()
  }, [])

  return center
}

// Whether reading the position won't prompt. False where the Permissions API
// can't tell, rather than risk a prompt nobody asked for.
async function isGeolocationGranted() {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" })
    return status?.state === "granted" && !!navigator.geolocation
  } catch {
    return false
  }
}
