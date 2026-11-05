"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import type { Coordinates } from "@/components/map/location-picker"
import { reversePlace, type Place } from "@/lib/geocoding"

// Answers by point, for this page's life: going back to the overview or
// moving the pin back doesn't ask again.
const cache = new Map<string, Place | null>()

// The address (or place) nearest a garden's pin, to show instead of its
// coordinates. Undefined while asking, null when unknown or unreachable.
export function usePlaceName(coordinates: Coordinates | null) {
  const locale = useLocale()
  // About 10 m: closer moves of the pin name the same place.
  const key = coordinates
    ? `${coordinates[0].toFixed(4)},${coordinates[1].toFixed(4)}`
    : null
  const [answer, setAnswer] = React.useState<{
    key: string
    place: Place | null
  } | null>(null)

  React.useEffect(() => {
    if (!key || !coordinates || cache.has(key)) {
      return
    }

    const controller = new AbortController()
    reversePlace(coordinates, { locale, signal: controller.signal })
      .then((place) => {
        cache.set(key, place)
        setAnswer({ key, place })
      })
      .catch(() => {
        if (!controller.signal.aborted) setAnswer({ key, place: null })
      })

    return () => controller.abort()
    // The key stands for the coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale])

  if (!key) return null
  if (cache.has(key)) return cache.get(key)!
  return answer?.key === key ? answer.place : undefined
}
