import type {
  LayerSpecification,
  StyleSpecification,
  TransformStyleFunction,
} from "maplibre-gl"

type Theme = "light" | "dark"

// OpenFreeMap's vector styles: free, no API key, built on OpenStreetMap data.
const STYLE_URLS: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
}

// A warm, quiet base where parks share the garden green, so the pins and the
// green spaces read as one family and nothing else competes with them.
const PALETTE: Record<Theme, Record<string, string>> = {
  light: {
    background: "#f7f6f2",
    residential: "#f1f0eb",
    park: "#dcefd6",
    wood: "#e3f0dc",
    water: "#d6e6ee",
    waterway: "#c9dde8",
    building: "#ebe9e3",
    extrusion: "#e7e4dc",
  },
  dark: {
    background: "#151515",
    residential: "#181818",
    park: "#1f3a24",
    wood: "#1d3322",
    water: "#16252e",
    waterway: "#16252e",
    building: "#222222",
    extrusion: "#262626",
  },
}

// Layer id → the paint property and palette color that replace the style's.
const RECOLORED: Record<string, [string, string]> = {
  background: ["background-color", "background"],
  landuse_residential: ["fill-color", "residential"],
  park: ["fill-color", "park"],
  landuse_park: ["fill-color", "park"],
  landcover_wood: ["fill-color", "wood"],
  water: ["fill-color", "water"],
  waterway: ["line-color", "waterway"],
  building: ["fill-color", "building"],
}

// Road shields and airports only add noise on a map of gardens.
const HIDDEN = new Set([
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  "airport",
])

function toTheme(theme: string | undefined): Theme {
  return theme === "dark" ? "dark" : "light"
}

export function mapStyleUrl(theme: string | undefined) {
  return STYLE_URLS[toTheme(theme)]
}

export function transformMapStyle(
  theme: string | undefined,
  { buildings }: { buildings: boolean }
): TransformStyleFunction {
  const palette = PALETTE[toTheme(theme)]

  return (_previous, next): StyleSpecification => {
    const layers: LayerSpecification[] = []

    for (const layer of next.layers) {
      if (HIDDEN.has(layer.id)) {
        continue
      }

      const recolor = RECOLORED[layer.id]
      if (recolor) {
        const paint: Record<string, unknown> = {
          ...layer.paint,
          [recolor[0]]: palette[recolor[1]],
        }
        // A pattern would hide the new color. The dark style's woods also
        // name one, "wood-pattern", that its sprite lacks, which MapLibre
        // warns about on every load.
        delete paint["fill-pattern"]
        layers.push({ ...layer, paint } as LayerSpecification)
      } else {
        layers.push(layer)
      }

      // Low 3D buildings right above the flat ones, under every label.
      if (buildings && layer.id === "building") {
        layers.push({
          id: "building-3d",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": palette.extrusion,
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              0,
            ],
            "fill-extrusion-opacity": 0.8,
          },
        })
      }
    }

    return { ...next, layers }
  }
}
