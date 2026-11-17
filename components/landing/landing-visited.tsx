"use client"

import * as React from "react"

import { dismissMapWelcome } from "@/lib/map-welcome"

// Someone who saw the landing already knows what the project is: the map
// doesn't greet them with the welcome card.
export function LandingVisited() {
  React.useEffect(() => dismissMapWelcome(), [])
  return null
}
