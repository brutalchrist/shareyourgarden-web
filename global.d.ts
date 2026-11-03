import type { routing } from "@/i18n/routing"
import type messages from "@/messages/es.json"

// Spanish is the source catalog: every key used in the code must exist there.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
