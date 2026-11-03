import { defineRouting } from "next-intl/routing"

// Every route lives under its locale (`/es/map/`, `/en/map/`) so the static
// export ships one prerendered HTML per language.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
})

export type Locale = (typeof routing.locales)[number]

// The language the visitor picked explicitly; absent means follow the browser.
export const LOCALE_PREFERENCE_KEY = "locale-preference"

// Each language in its own language, so anyone finds theirs whatever the
// current one is.
export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
}
