"use client"

import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import { usePageVisible } from "@/hooks/use-page-visible"
import {
  getConversationsSummary,
  type ConversationsSummary,
} from "@/lib/conversations"

// Unread counts are a background hint: every 30 s is enough, and the inbox
// refreshes them right away when something changes there.
const POLL_MS = 30_000

interface MessagesContextValue {
  // null until the first summary arrives, and while signed out.
  summary: ConversationsSummary | null
  refresh: () => void
}

const MessagesContext = React.createContext<MessagesContextValue | null>(null)

function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const visible = usePageVisible()
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
          if (!controller.signal.aborted) timer = setTimeout(load, POLL_MS)
        })
    }

    load()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [authenticated, visible, refreshKey])

  const refresh = React.useCallback(() => setRefreshKey((key) => key + 1), [])

  const value = React.useMemo(() => ({ summary, refresh }), [summary, refresh])

  return (
    <MessagesContext.Provider value={value}>
      <UnreadTitle unread={summary?.unread ?? 0} />
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

export { MessagesProvider, useMessages }
