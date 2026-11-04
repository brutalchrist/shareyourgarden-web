import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api"
import { getToken } from "@/lib/auth-token"
import { isInstalled, isIos } from "@/lib/platform"
import type { Locale } from "@/i18n/routing"

// Web Push for new messages: the browser subscribes with the backend's VAPID
// key and the backend pushes to that subscription; `public/sw.js` shows the
// notification. A subscription belongs to this browser, so it goes on
// sign-out.
//
// - unavailable: the backend has no push configured (503), or can't be reached.
// - unsupported: the browser has no Web Push.
// - ios-install: iOS only allows push in the app added to the home screen.
// - denied: the user blocked notifications for the site.
export type PushState =
  "unavailable" | "unsupported" | "ios-install" | "denied" | "off" | "on"

// The service worker is only registered in production builds.
function pushSupported() {
  return (
    process.env.NODE_ENV === "production" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

let publicKey: Promise<string | null> | undefined

// null when the backend has push turned off. Other failures are retried on the
// next call.
export function getPushPublicKey(): Promise<string | null> {
  publicKey ??= apiGet<{ publicKey: string }>("/push/public-key").then(
    ({ publicKey }) => publicKey,
    (error) => {
      if (error instanceof ApiError && error.status === 503) return null
      publicKey = undefined
      throw error
    }
  )
  return publicKey
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function getPushState(): Promise<PushState> {
  if (!(await getPushPublicKey().catch(() => null))) return "unavailable"
  if (isIos() && !isInstalled()) return "ios-install"
  if (!pushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"

  const subscription = await currentSubscription()
  const on = Notification.permission === "granted" && !!subscription
  setPushActive(on)
  return on ? "on" : "off"
}

function sendSubscription(subscription: PushSubscription, locale: Locale) {
  const { endpoint, keys } = subscription.toJSON()
  return apiPost<void>("/push/subscriptions", { endpoint, keys, locale })
}

// Asks for permission, so only call it from a click: browsers ignore or
// penalize prompts nobody asked for.
export async function enablePush(locale: Locale): Promise<PushState> {
  // Safari wants the prompt straight from the click, before any other await.
  const permission = await Notification.requestPermission()
  if (permission === "denied") return "denied"
  if (permission !== "granted") return "off"

  const key = await getPushPublicKey()
  if (!key) return "unavailable"

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromBase64Url(key),
    }))

  try {
    await sendSubscription(subscription, locale)
  } catch (error) {
    // Unknown to the backend, it would never get a push.
    await subscription.unsubscribe()
    throw error
  }
  setPushActive(true)
  return "on"
}

// Turns push off on this device: the backend forgets it and the browser drops
// it. Also called on sign-out, so it captures the token before it goes.
export async function disablePush(): Promise<void> {
  const token = getToken()
  setPushActive(false)
  if (!pushSupported()) return

  const subscription = await currentSubscription()
  if (!subscription) return

  try {
    await apiDelete("/push/subscriptions", {
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } finally {
    // Even if the backend missed it, a push to a dropped subscription fails
    // and the backend removes it then.
    await subscription.unsubscribe()
  }
}

// After sign-in or a language change, the browser may already be subscribed:
// tell the backend whose it is now and in which language to write.
export async function syncPushSubscription(locale: Locale): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") {
    setPushActive(false)
    return
  }

  const subscription = await currentSubscription()
  setPushActive(!!subscription)
  if (subscription) await sendSubscription(subscription, locale)
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

// Whether this device gets pushes, so polling can slow down.
let active = false
const listeners = new Set<() => void>()

function setPushActive(value: boolean) {
  if (active === value) return
  active = value
  listeners.forEach((listener) => listener())
}

export function subscribePushActive(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function isPushActive() {
  return active
}
