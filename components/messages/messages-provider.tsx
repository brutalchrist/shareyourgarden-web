"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import { usePageVisible } from "@/hooks/use-page-visible"
import { usePushActive, usePushMessages } from "@/hooks/use-push"
import {
  getConversationsSummary,
  type ConversationsSummary,
} from "@/lib/conversations"
import { syncPushSubscription } from "@/lib/push"

// Unread counts are a background hint: every 30 s is enough, and the inbox
// refreshes them right away when something changes there. With push on, a
// new message refreshes them too, so polling only catches what push missed.
const POLL_MS = 30_000
const PUSH_POLL_MS = 120_000

interface MessagesContextValue {
  // null until the first summary arrives, and while signed out.
  summary: ConversationsSummary | null
  refresh: () => void
}

const MessagesContext = React.createContext<MessagesContextValue | null>(null)

function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const locale = useLocale()
  const visible = usePageVisible()
  const pushActive = usePushActive()
  const pollMs = pushActive ? PUSH_POLL_MS : POLL_MS
  const [summary, setSummary] = React.useState<ConversationsSummary | null>(
    null
  )
  const [refreshKey, setRefreshKey] = React.useState(0)
  const authenticated = status === "authenticated"

  // Forget the previous user's counts on sign-out.
  if (!authenticated && summary) {
    setSummary(null)
  }

  React.useEffect(() => {
    if (!authenticated || !visible) {
      return
    }

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = () => {
      getConversationsSummary(controller.signal)
        .then(setSummary)
        .catch((error) => {
          // Keeps the last counts; the next poll tries again.
          if (!controller.signal.aborted) console.error(error)
        })
        .finally(() => {
          if (!controller.signal.aborted) timer = setTimeout(load, pollMs)
        })
    }

    load()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [authenticated, visible, refreshKey, pollMs])

  // A subscription this browser already has now pushes to this user, in the
  // current language.
  React.useEffect(() => {
    if (!authenticated) return
    syncPushSubscription(locale).catch((error) => console.error(error))
  }, [authenticated, locale])

  const refresh = React.useCallback(() => setRefreshKey((key) => key + 1), [])

  usePushMessages(refresh)

  const value = React.useMemo(() => ({ summary, refresh }), [summary, refresh])

  return (
    <MessagesContext.Provider value={value}>
      <UnreadTitle unread={summary?.unread ?? 0} />
      <AppBadge unread={status === "anonymous" ? 0 : summary?.unread} />
      {children}
    </MessagesContext.Provider>
  )
}

function useMessages() {
  const context = React.useContext(MessagesContext)

  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }

  return context
}

const TITLE_PREFIX = /^\(\d+\+?\) /

export function formatUnread(count: number): string {
  return count > 99 ? "99+" : String(count)
}

/**
 * Prefixes the tab title with the unread count, "(3) ShareYourGarden", like
 * most messaging apps. Next.js rewrites the title on navigation, so the
 * prefix is put back whenever the title changes.
 */
function UnreadTitle({ unread }: { unread: number }) {
  React.useEffect(() => {
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "")
      const next = unread > 0 ? `(${formatUnread(unread)}) ${base}` : base
      // Only write when it changes, or the observer would loop.
      if (document.title !== next) document.title = next
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
      document.title = document.title.replace(TITLE_PREFIX, "")
    }
  }, [unread])

  return null
}

/**
 * Shows the unread count on the installed app's icon, where supported. The
 * service worker sets it from pushes while the app is closed.
 */
function AppBadge({ unread }: { unread: number | undefined }) {
  React.useEffect(() => {
    // Keeps the service worker's count until the first summary arrives.
    if (unread === undefined || !("setAppBadge" in navigator)) return

    const update =
      unread > 0 ? navigator.setAppBadge(unread) : navigator.clearAppBadge()
    update.catch(() => {})
  }, [unread])

  return null
}

export { MessagesProvider, useMessages }
