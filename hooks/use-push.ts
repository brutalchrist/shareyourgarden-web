import * as React from "react"

import { isPushActive, subscribePushActive } from "@/lib/push"

// Whether this device gets push notifications for new messages, so polling for
// them can slow down.
export function usePushActive(): boolean {
  return React.useSyncExternalStore(
    subscribePushActive,
    isPushActive,
    () => false
  )
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
