import L from "leaflet"

// Lucide's sprout, inlined: Leaflet takes the icon as an HTML string.
const SPROUT_ICON = `<svg class="garden-marker__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/><path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/><path d="M5 21h14"/></svg>`

const PIN_SHAPE = `<svg class="garden-marker__shape" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 1.5C8.9 1.5 1.5 8.7 1.5 17.6c0 11 13.7 22.8 15.6 24.4a1.4 1.4 0 0 0 1.8 0c1.9-1.6 15.6-13.4 15.6-24.4C34.5 8.7 27.1 1.5 18 1.5z"/></svg>`

function gardenIcon({ own }: { own: boolean }) {
  return L.divIcon({
    // Replaces Leaflet's default `leaflet-div-icon` white box. Styled in map.css.
    className: own ? "garden-marker garden-marker--own" : "garden-marker",
    html: `<div class="garden-marker__pin">${PIN_SHAPE}${SPROUT_ICON}</div>`,
    iconSize: [36, 44],
    // The tip of the pin.
    iconAnchor: [18, 43],
  })
}

export const markerIcon = gardenIcon({ own: false })

// The signed-in user's own gardens: the same pin, outlined instead of filled.
export const ownMarkerIcon = gardenIcon({ own: true })

export const userLocationIcon = L.divIcon({
  className: "user-location",
  iconSize: [16, 16],
})
