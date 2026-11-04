import type { MetadataRoute } from "next"
import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"

// Written once at build time for the static export.
export const dynamic = "force-static"

// One manifest for every locale: the installed app opens `/`, which picks the
// language in the browser like any other path without one.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "Metadata",
  })

  return {
    id: "/",
    name: t("title"),
    short_name: t("title"),
    description: t("description"),
    lang: routing.defaultLocale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["food", "lifestyle", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
