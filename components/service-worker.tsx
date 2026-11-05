"use client"

import * as React from "react"

// Registers `public/sw.js`, which keeps the app working offline once
// installed. Skipped in development, where cached pages would hide changes.
export function ServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Service worker failed", error))
  }, [])

  return null
}
