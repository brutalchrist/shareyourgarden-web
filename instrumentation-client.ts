import posthog from "posthog-js"

import { ANALYTICS_KEY } from "@/lib/analytics"

// Query parameters that place a point on the map: a focused garden's
// position, which isn't sent with the page's address.
const LOCATION_PARAMS = ["lat", "lng"]

function withoutLocation(value: unknown) {
  if (typeof value !== "string") return value

  try {
    const url = new URL(value)
    LOCATION_PARAMS.forEach((param) => url.searchParams.delete(param))
    return url.toString()
  } catch {
    return value
  }
}

// Runs before the app hydrates, as Next.js recommends for analytics.
if (ANALYTICS_KEY) {
  posthog.init(ANALYTICS_KEY, {
    // Through Netlify (`public/_redirects`), so ad blockers that block
    // PostHog's own domain don't drop the events.
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // The newest defaults in the installed SDK, pinned: pageviews on every
    // navigation (`capture_pageview: "history_change"`), among others.
    defaults: "2026-08-30",
    // Nothing is stored until the visitor accepts the banner; until then, and
    // if they reject it, events are anonymous and cookieless. This needs
    // cookieless mode turned on in the PostHog project's settings.
    opt_out_capturing_by_default: true,
    cookieless_mode: "on_reject",
    // Profiles only for signed-in users who accepted (`identifyUser`).
    person_profiles: "identified_only",
    // Ad-click IDs (gclid, fbclid…) out of the recorded URLs.
    mask_personal_data_properties: true,
    session_recording: {
      // Typed text never leaves the browser; shown text that is private
      // (conversations) is blocked with `ph-no-capture` where it renders.
      maskAllInputs: true,
    },
    before_send: (event) => {
      if (!event) return event
      for (const key of ["$current_url", "$referrer", "$initial_current_url"]) {
        if (key in event.properties) {
          event.properties[key] = withoutLocation(event.properties[key])
        }
      }
      return event
    },
  })
}
