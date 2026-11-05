import { setWorkerUrl } from "maplibre-gl"

// MapLibre 6 finds its worker next to its own module at runtime, a path the
// bundler cannot see, so the worker is never emitted and the map stays blank.
// A literal `new URL(..., import.meta.url)` makes the bundler copy the file
// and gives MapLibre its real URL. Import this module before creating a map.
if (typeof window !== "undefined") {
  setWorkerUrl(
    new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
  )
}
