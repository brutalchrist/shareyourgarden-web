// Service worker for the installed app. It only handles this site's own files:
// the API, map tiles and Google sign-in go straight to the network.
//
// - Pages: network first, so a deploy shows up at once; offline, the last
//   copy seen, or the offline page in the path's language.
// - `/_next/static/`: cache first, since their names change with their content.
// - Other files (icons, the manifest): the cached copy, refreshed in the
//   background.
// - Page data for client-side navigation (`?_rsc=`) and edge functions
//   (`/api/`): the network only.
//
// It also shows push notifications for new messages (see `lib/push.ts`) and
// keeps the app icon's badge at the unread count.
//
// Bump VERSION to drop every cache on the next visit.
const VERSION = "v1"
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`

const LOCALES = ["es", "en"]
const DEFAULT_LOCALE = "es"
const OFFLINE_PAGES = LOCALES.map((locale) => `/${locale}/offline/`)
// `/map/` is where the installed app opens (`app/manifest.ts`).
const PRECACHE = [
  "/",
  "/map/",
  ...OFFLINE_PAGES,
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
]

// Old builds' chunks pile up across deploys; keep only the newest ones.
const MAX_ASSETS = 300

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PAGES && key !== ASSETS)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== "GET" || url.origin !== self.location.origin) return
  // Page data for client-side navigation must match the deployed build; when
  // it fails, the router falls back to loading the page, handled below.
  if (url.searchParams.has("_rsc")) return
  // Edge functions answer per visitor (`/api/geo`: their position).
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(page(request, url))
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(immutable(request))
  } else {
    event.respondWith(staleWhileRevalidate(request, event))
  }
})

// The offline pages need their scripts and styles too, or they render without
// them; those are only known from the HTML. They go with the pages, which are
// never trimmed.
async function precache() {
  const pages = await caches.open(PAGES)
  await pages.addAll(PRECACHE)

  const files = new Set()
  for (const path of OFFLINE_PAGES) {
    const html = await (await pages.match(path)).text()
    for (const [, file] of html.matchAll(/"(\/_next\/static\/[^"\\]+)"/g)) {
      files.add(file)
    }
  }
  await pages.addAll([...files])
}

async function page(request, url) {
  const cache = await caches.open(PAGES)

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached) return cached

    const locale = url.pathname.split("/")[1]
    const offline = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
    return (await cache.match(`/${offline}/offline/`)) ?? Response.error()
  }
}

async function immutable(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const cache = await caches.open(ASSETS)
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    trim(cache)
  }
  return response
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })

  if (cached) {
    event.waitUntil(network.catch(() => {}))
    return cached
  }
  return network
}

// Cache keys come back in insertion order, so the oldest go first.
async function trim(cache) {
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) {
    await cache.delete(key)
  }
}

// Push payloads never carry the message text, only who wrote and about which
// garden: `{ type: "message", conversationId, senderName, gardenName, locale,
// unread }`.
const NOTIFICATION_TITLE = {
  es: (name) => `Nuevo mensaje de ${name}`,
  en: (name) => `New message from ${name}`,
}
const FALLBACK_SENDER = { es: "alguien", en: "someone" }

self.addEventListener("push", (event) => {
  event.waitUntil(notify(event))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(openApp(event.notification.data?.url))
})

async function notify(event) {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {}

  const locale = LOCALES.includes(data.locale) ? data.locale : DEFAULT_LOCALE
  const id = typeof data.conversationId === "string" ? data.conversationId : ""
  // Same format as `messagesHref` in `lib/conversations.ts`.
  const url = id
    ? `/${locale}/messages/?c=${encodeURIComponent(id)}`
    : `/${locale}/messages/`

  if (typeof data.unread === "number") await setBadge(data.unread)

  // Open windows refresh their unread counts and inbox.
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  for (const client of windows) {
    client.postMessage({ type: "push", conversationId: id })
  }

  // Already reading that conversation: the page shows the message itself.
  // Safari stops delivering pushes that show no notification, so it always
  // gets one.
  if (id && !isApple() && windows.some((client) => isReading(client, id))) {
    return
  }

  const sender = data.senderName || FALLBACK_SENDER[locale]
  await self.registration.showNotification(NOTIFICATION_TITLE[locale](sender), {
    body: data.gardenName ?? "",
    icon: "/icons/icon-192.png",
    lang: locale,
    // One notification per conversation, replaced by the next message.
    tag: id ? `conversation-${id}` : "messages",
    renotify: true,
    data: { url },
  })
}

async function setBadge(unread) {
  const { navigator } = self
  if (!("setAppBadge" in navigator)) return
  try {
    if (unread > 0) await navigator.setAppBadge(unread)
    else await navigator.clearAppBadge()
  } catch {}
}

// Safari on any Apple device, including the app installed from it, whose user
// agent has no "Safari".
function isApple() {
  const agent = self.navigator.userAgent
  return /AppleWebKit/.test(agent) && !/Chrome|Chromium|Android/.test(agent)
}

function isReading(client, conversationId) {
  const url = new URL(client.url)
  return (
    client.visibilityState === "visible" &&
    /^\/[a-z]{2}\/messages\/$/.test(url.pathname) &&
    url.searchParams.get("c") === conversationId
  )
}

// Focuses a window of the app and takes it to the conversation, or opens one.
async function openApp(path = `/${DEFAULT_LOCALE}/messages/`) {
  const url = new URL(path, self.location.origin).href
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  const client =
    windows.find((client) => client.visibilityState === "visible") ?? windows[0]

  if (client) {
    await client.focus()
    if (client.url === url) return
    try {
      await client.navigate(url)
      return
    } catch {
      // Not controlled by this worker; fall through to a new window.
    }
  }
  await self.clients.openWindow(url)
}
