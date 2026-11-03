import L from "leaflet"

// OpenStreetMap's standard tiles, muted in map.css (and darkened in dark
// mode) so the green garden pins are the one thing that stands out.
export function createBaseLayer(maxZoom: number) {
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
}
