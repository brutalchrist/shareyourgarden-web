import { hasLocale, type AbstractIntlMessages } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { routing } from "@/i18n/routing"

function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  return import(`../messages/${locale}.json`).then((module) => module.default)
}

// Messages missing from a translation fall back to the default locale's, so
// a gap shows Spanish instead of the raw key. CI keeps the catalogs in sync
// (`pnpm check:messages`); this only covers a slip.
function withFallback(
  messages: AbstractIntlMessages,
  fallback: AbstractIntlMessages
): AbstractIntlMessages {
  const merged: AbstractIntlMessages = { ...fallback }

  for (const [key, value] of Object.entries(messages)) {
    const base = fallback[key]
    merged[key] =
      typeof value === "object" && typeof base === "object"
        ? withFallback(value, base)
        : value
  }

  return merged
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const messages = await loadMessages(locale)

  return {
    locale,
    messages:
      locale === routing.defaultLocale
        ? messages
        : withFallback(messages, await loadMessages(routing.defaultLocale)),
  }
})
