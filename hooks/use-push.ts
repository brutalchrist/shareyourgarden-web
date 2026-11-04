import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { usePageVisible } from "@/hooks/use-page-visible"
import {
  disablePush,
  enablePush,
  getPushState,
  isPushActive,
  subscribePushActive,
  type PushState,
} from "@/lib/push"

// Whether this device gets push notifications for new messages, so polling for
// them can slow down.
export function usePushActive(): boolean {
  return React.useSyncExternalStore(
    subscribePushActive,
    isPushActive,
    () => false
  )
}

// This device's push state and a way to change it, shared by the user menu and
// the messages page: turning them on or off in one updates the other. null
// until known. The browser only asks for permission from `toggle`, so call it
// from a click.
export function usePushToggle() {
  const t = useTranslations("PushNotifications")
  const locale = useLocale()
  const visible = usePageVisible()
  const [state, setState] = React.useState<PushState | null>(null)
  const [busy, setBusy] = React.useState(false)
  // Only the latest check counts.
  const checkRef = React.useRef(0)

  const refresh = React.useCallback(async () => {
    const check = ++checkRef.current
    const next = await getPushState().catch((error) => {
      console.error(error)
      return "unavailable" as const
    })
    if (check === checkRef.current) setState(next)
    return next
  }, [])

  // Checked again on coming back, e.g. after allowing them in the settings.
  React.useEffect(() => {
    if (!visible) return

    refresh()
    const unsubscribe = subscribePushActive(refresh)
    return () => {
      unsubscribe()
    }
  }, [visible, refresh])

  // The state it ends in, or null when it failed.
  const toggle = async (on: boolean): Promise<PushState | null> => {
    setBusy(true)
    try {
      const next = on ? await enablePush(locale) : (await disablePush(), "off")
      checkRef.current++
      setState(next)
      return next
    } catch (error) {
      console.error(error)
      toast.error(t(on ? "enableError" : "disableError"))
      await refresh()
      return null
    } finally {
      setBusy(false)
    }
  }

  return { state, busy, toggle }
}

// Calls `onPush` with the conversation of each new message pushed while the
// app is open (`public/sw.js` forwards them to every window).
export function usePushMessages(onPush: (conversationId: string) => void) {
  const onPushRef = React.useRef(onPush)
  React.useEffect(() => {
    onPushRef.current = onPush
  })

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push") {
        onPushRef.current(String(event.data.conversationId ?? ""))
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])
}
