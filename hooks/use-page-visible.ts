import * as React from "react"

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

// Whether the tab is in the foreground, to pause polling while it is hidden.
export function usePageVisible(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true
  )
}
