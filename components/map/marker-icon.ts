import L from "leaflet"

import type { ProductType } from "@/lib/products"

// Lucide icons (ISC), inlined: Leaflet takes icons as HTML strings.
const SPROUT = `<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/><path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/><path d="M5 21h14"/>`

const PRODUCT_ICONS: Record<ProductType, string> = {
  vegetable: `<path d="M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3"/><path d="M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7"/><path d="m8 15-2.58-2.58"/>`,
  fruit: `<path d="M12 6.528V3a1 1 0 0 1 1-1h0"/><path d="M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21"/>`,
  herb: `<path d="M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20"/><path d="M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13"/>`,
  flower: `<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>`,
  seed: `<path d="M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z"/><path d="M5.341 10.62a4 4 0 1 0 5.279-5.28"/>`,
  seedbed: SPROUT,
  supply: `<path d="M21.56 4.56a1.5 1.5 0 0 1 0 2.122l-.47.47a3 3 0 0 1-4.212-.03 3 3 0 0 1 0-4.243l.44-.44a1.5 1.5 0 0 1 2.121 0z"/><path d="M3 22a1 1 0 0 1-1-1v-3.586a1 1 0 0 1 .293-.707l3.355-3.355a1.205 1.205 0 0 1 1.704 0l3.296 3.296a1.205 1.205 0 0 1 0 1.704l-3.355 3.355a1 1 0 0 1-.707.293z"/><path d="m9 15 7.879-7.878"/>`,
}

const PIN_SHAPE = `<svg class="garden-marker__shape" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 1.5C8.9 1.5 1.5 8.7 1.5 17.6c0 11 13.7 22.8 15.6 24.4a1.4 1.4 0 0 0 1.8 0c1.9-1.6 15.6-13.4 15.6-24.4C34.5 8.7 27.1 1.5 18 1.5z"/></svg>`

function productIcon(type: string | undefined, className: string) {
  const paths =
    type && type in PRODUCT_ICONS ? PRODUCT_ICONS[type as ProductType] : SPROUT
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export interface GardenIconOptions {
  // Product type shown in the icon; a sprout when missing or unknown.
  type?: string
  // The signed-in user's garden: outlined instead of filled.
  own?: boolean
  selected?: boolean
  // Close up, the pin becomes a chip with the garden's name and product count.
  chip?: { name: string; count: number }
}

// A string that changes whenever the icon would look different, so markers
// only rebuild their element when needed.
export function gardenIconKey({
  type,
  own,
  selected,
  chip,
}: GardenIconOptions) {
  return [type, own, selected, chip?.name, chip?.count].join("|")
}

export function gardenIcon({ type, own, selected, chip }: GardenIconOptions) {
  if (chip) {
    const classes = ["garden-chip"]
    if (own) classes.push("garden-chip--own")
    if (selected) classes.push("garden-chip--selected")

    return L.divIcon({
      className: classes.join(" "),
      // No size: the chip is as wide as its name and centers itself on the
      // point in map.css.
      iconSize: undefined,
      html: `<div class="garden-chip__body"><span class="garden-chip__badge">${productIcon(type, "garden-chip__icon")}</span><span class="garden-chip__name">${escapeHtml(chip.name)}</span><span class="garden-chip__count">${chip.count}</span></div>`,
    })
  }

  // Replaces Leaflet's default `leaflet-div-icon` white box. Styled in map.css.
  const classes = ["garden-marker"]
  if (own) classes.push("garden-marker--own")
  if (selected) classes.push("garden-marker--selected")

  return L.divIcon({
    className: classes.join(" "),
    html: `<div class="garden-marker__pin">${PIN_SHAPE}${productIcon(type, "garden-marker__icon")}</div>`,
    iconSize: [36, 44],
    // The tip of the pin.
    iconAnchor: [18, 43],
  })
}

export const markerIcon = gardenIcon({})

// Grows with the number of gardens it holds.
export function clusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52

  return L.divIcon({
    className: "garden-cluster",
    html: `<div class="garden-cluster__body">${count}</div>`,
    iconSize: [size, size],
  })
}

export const userLocationIcon = L.divIcon({
  className: "user-location",
  iconSize: [16, 16],
})
