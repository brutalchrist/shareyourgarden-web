import type { Metadata } from "next"

import { routing } from "@/i18n/routing"

// `hreflang` links to the same page in every locale. `x-default` is the path
// without a locale, which picks one in the browser.
export function localeAlternates(path: string): Metadata["alternates"] {
  return {
    languages: {
      ...Object.fromEntries(
        routing.locales.map((locale) => [locale, `/${locale}${path}`])
      ),
      "x-default": path,
    },
  }
}
