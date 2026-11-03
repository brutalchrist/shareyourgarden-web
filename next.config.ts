import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Static export to `out/`, served as plain files by Netlify.
  output: "export",
  // Emit `map/index.html` instead of `map.html` so any static server resolves `/map`.
  trailingSlash: true,
}

export default nextConfig
