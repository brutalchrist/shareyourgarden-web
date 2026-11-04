"use client"

import * as React from "react"

import { usePageVisible } from "@/hooks/use-page-visible"
import { usePushActive, usePushMessages } from "@/hooks/use-push"
import { listConversations, type ConversationFilter } from "@/lib/conversations"
import type { Conversation } from "@/lib/types"

const PAGE_SIZE = 20
// The inbox refreshes in the background; the open thread polls faster. With
// push on, new messages announce themselves, so it can wait longer.
const POLL_MS = 30_000
const PUSH_POLL_MS = 120_000

export type ConversationListStatus = "loading" | "ready" | "error"

export interface ConversationFilters {
  role: ConversationFilter
  gardenId: string | null
}

const lastActivity = (conversation: Conversation) =>
  conversation.lastMessage?.createdAt ?? conversation.createdAt

// Latest message first, like the backend.
const byLastActivity = (a: Conversation, b: Conversation) =>
  lastActivity(b).localeCompare(lastActivity(a))

function matches(conversation: Conversation, filters: ConversationFilters) {
  if (filters.role === "received" && conversation.role !== "owner") {
    return false
  }
  if (filters.role === "sent" && conversation.role !== "requester") {
    return false
  }
  return !filters.gardenId || conversation.gardenId === filters.gardenId
}

// Puts fresh copies over the ones already listed, keeping older pages.
function merge(current: Conversation[], fresh: Conversation[]) {
  const freshIds = new Set(fresh.map((conversation) => conversation.id))
  return [
    ...fresh,
    ...current.filter((conversation) => !freshIds.has(conversation.id)),
  ].sort(byLastActivity)
}

export function useConversationList(filters: ConversationFilters) {
  const [state, setState] = React.useState<{
    filtersKey: string
    conversations: Conversation[]
    hasMore: boolean
    status: ConversationListStatus
  }>({ filtersKey: "", conversations: [], hasMore: false, status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const visible = usePageVisible()
  const pollMs = usePushActive() ? PUSH_POLL_MS : POLL_MS

  const filtersKey = `${filters.role}:${filters.gardenId ?? ""}`
  const { role, gardenId } = filters

  // Changing filters starts over instead of showing the previous list.
  if (state.filtersKey !== filtersKey) {
    setState({
      filtersKey,
      conversations: [],
      hasMore: false,
      status: "loading",
    })
  }

  React.useEffect(() => {
    if (!visible) {
      return
    }

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = () => {
      listConversations(
        { role, gardenId: gardenId ?? undefined, limit: PAGE_SIZE },
        controller.signal
      )
        .then((page) => {
          setState((current) => ({
            filtersKey,
            conversations: merge(
              current.filtersKey === filtersKey ? current.conversations : [],
              page.conversations
            ),
            // Older pages already loaded keep their own "more" flag.
            hasMore:
              current.filtersKey === filtersKey &&
              current.conversations.length > page.conversations.length
                ? current.hasMore
                : page.hasMore,
            status: "ready",
          }))
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          console.error(error)
          // A failed refresh keeps the list it already has.
          setState((current) =>
            current.status === "loading"
              ? { ...current, status: "error" }
              : current
          )
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
  }, [role, gardenId, filtersKey, visible, attempt, pollMs])

  // A pushed message moves its conversation to the top right away.
  usePushMessages(() => setAttempt((value) => value + 1))

  const loadMore = React.useCallback(async () => {
    const last = state.conversations.at(-1)
    if (!last || loadingMore) return

    setLoadingMore(true)
    try {
      const page = await listConversations({
        role,
        gardenId: gardenId ?? undefined,
        before: lastActivity(last),
        limit: PAGE_SIZE,
      })
      setState((current) =>
        current.filtersKey === filtersKey
          ? {
              ...current,
              conversations: merge(current.conversations, page.conversations),
              hasMore: page.hasMore,
            }
          : current
      )
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingMore(false)
    }
  }, [state.conversations, loadingMore, role, gardenId, filtersKey])

  // Applies a change made in the open thread (new message, read) right away.
  const upsert = React.useCallback(
    (conversation: Conversation) => {
      setState((current) => {
        const listed = current.conversations.some(
          (other) => other.id === conversation.id
        )
        if (!listed && !matches(conversation, { role, gardenId })) {
          return current
        }
        return {
          ...current,
          conversations: merge(current.conversations, [conversation]),
        }
      })
    },
    [role, gardenId]
  )

  return {
    conversations: state.conversations,
    hasMore: state.hasMore,
    status: state.status,
    loadingMore,
    loadMore,
    upsert,
    retry: () => setAttempt((value) => value + 1),
  }
}
