import posthog from "posthog-js"

import type { ProductType } from "@/lib/products"

// Product analytics with PostHog. Without a project key (local development,
// forks) every function here does nothing.
export const ANALYTICS_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
export const analyticsEnabled = Boolean(ANALYTICS_KEY)

// Every event the app sends and its properties, so names stay consistent
// across the code and the PostHog dashboards built on them. No event carries
// personal data or an exact location.
export interface AnalyticsEvents {
  // Map.
  map_searched: { query: string }
  map_filtered: { product_type: ProductType | null }
  garden_opened: { own: boolean; product_count: number; from: "map" | "link" }
  garden_photos_opened: { product_type: string; photo_count: number }
  // Contact and messages.
  contact_started: { signed_in: boolean }
  message_sent: {
    first: boolean
    shared_location: boolean
    about_product: boolean
  }
  // Gardens.
  garden_create_step_viewed: { step: "info" | "location" | "products" }
  garden_created: { product_count: number }
  garden_section_opened: { section: "info" | "location" | "products" }
  garden_saved: {
    layout: "page" | "section" | "overview"
    sections: ("info" | "location" | "products")[]
  }
  garden_visibility_changed: { visible: boolean }
  product_quantity_stepped: { direction: "up" | "down"; sold_out: boolean }
  update_products_shortcut_used: Record<string, never>
  // App.
  pwa_install_answered: { outcome: "accepted" | "dismissed" }
  push_toggled: { enabled: boolean }
  beta_feedback_clicked: { from: "badge" | "tour" }
  language_changed: { locale: string }
}

export function track<E extends keyof AnalyticsEvents>(
  event: E,
  ...[properties]: AnalyticsEvents[E] extends Record<string, never>
    ? []
    : [AnalyticsEvents[E]]
) {
  if (!analyticsEnabled) return
  posthog.capture(event, properties)
}

// Analytics consent: "pending" until the visitor answers the banner.
export type Consent = "granted" | "denied" | "pending"

export function getConsent(): Consent {
  return analyticsEnabled ? posthog.get_explicit_consent_status() : "granted"
}

const consentListeners = new Set<() => void>()

export function subscribeConsent(listener: () => void) {
  consentListeners.add(listener)
  return () => {
    consentListeners.delete(listener)
  }
}

// Accepting measures with cookies, so returning visitors are recognized.
// Rejecting (and not answering yet) still measures, anonymously and without
// cookies or storage (`cookieless_mode: "on_reject"`).
export function setConsent(granted: boolean) {
  if (!analyticsEnabled) return
  if (granted) posthog.opt_in_capturing()
  else posthog.opt_out_capturing()
  consentListeners.forEach((listener) => listener())
}

// Shows the banner again, to change the answer.
export function reopenConsent() {
  if (!analyticsEnabled) return
  posthog.clear_opt_in_out_capturing()
  consentListeners.forEach((listener) => listener())
}

// Ties the visitor's events to their account by its internal id, never their
// email or name. Only with consent: without it nothing links them.
export function identifyUser(id: string) {
  if (!analyticsEnabled || getConsent() !== "granted") return
  posthog.identify(id)
}

// On sign out, so the next person on this browser starts anew.
export function resetUser() {
  if (!analyticsEnabled) return
  posthog.reset()
}
