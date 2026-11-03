"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { getPathname, usePathname } from "@/i18n/navigation"
import { LOCALE_PREFERENCE_KEY, routing, type Locale } from "@/i18n/routing"

// "auto" follows the browser (on phones, the system language).
export type LocalePreference = Locale | "auto"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changing the preference.
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readPreference(): LocalePreference {
  try {
    const saved = localStorage.getItem(LOCALE_PREFERENCE_KEY)
    return routing.locales.includes(saved as Locale)
      ? (saved as Locale)
      : "auto"
  } catch {
    return "auto"
  }
}

function writePreference(preference: LocalePreference) {
  try {
    if (preference === "auto") {
      localStorage.removeItem(LOCALE_PREFERENCE_KEY)
    } else {
      localStorage.setItem(LOCALE_PREFERENCE_KEY, preference)
    }
  } catch {
    // Storage blocked: the choice still applies to this visit through the URL.
  }
  listeners.forEach((listener) => listener())
}

// Same matching as the root redirect page.
export function browserLocale(): Locale {
  const languages =
    typeof navigator === "undefined"
      ? []
      : (navigator.languages ?? [navigator.language])

  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0]
    if (routing.locales.includes(base as Locale)) return base as Locale
  }

  return routing.defaultLocale
}

export function useLocalePreference() {
  const locale = useLocale()
  const pathname = usePathname()
  // The static HTML can't know the saved preference: it renders "auto" and
  // picks up the stored value once hydrated.
  const preference = React.useSyncExternalStore(
    subscribe,
    readPreference,
    () => "auto" as const
  )
  const detected = React.useSyncExternalStore(
    subscribe,
    browserLocale,
    () => routing.defaultLocale
  )

  const setPreference = React.useCallback(
    (next: LocalePreference) => {
      writePreference(next)

      const target = next === "auto" ? browserLocale() : next
      if (target !== locale) {
        // A full load of the same page in the other locale, keeping the query
        // (`?id=`): the root layout, `<html lang>` and every provider start
        // over in the new locale instead of re-rendering on the client.
        window.location.assign(
          getPathname({ href: pathname, locale: target }) +
            window.location.search +
            window.location.hash
        )
      }
    },
    [locale, pathname]
  )

  return { locale, preference, detected, setPreference }
}
