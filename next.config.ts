import { execSync } from "node:child_process"

import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

// The release shown in the app: the tag being built (`v0.1.1`), or the last tag
// plus the commits since it (`v0.1.1-3-g1a2b3c4`) on previews and locally.
// Without tags, the short commit; without git, nothing.
function appVersion() {
  try {
    return execSync("git describe --tags --match 'v*' --always", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
  } catch {
    return ""
  }
}

const nextConfig: NextConfig = {
  // Static export to `out/`, served as plain files by Netlify.
  output: "export",
  // Emit `map/index.html` instead of `map.html` so any static server resolves `/map`.
  trailingSlash: true,
  env: {
    APP_VERSION: appVersion(),
  },
}

export default withNextIntl(nextConfig)
