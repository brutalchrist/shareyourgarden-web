"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { LogInIcon, MessagesSquareIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { ConversationList } from "@/components/messages/conversation-list"
import { ConversationThread } from "@/components/messages/conversation-thread"
import { useMessages } from "@/components/messages/messages-provider"
import { useConversationList } from "@/components/messages/use-conversation-list"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CONVERSATION_FILTERS,
  messagesHref,
  type ConversationFilter,
} from "@/lib/conversations"
import type { Conversation } from "@/lib/types"
import { cn } from "@/lib/utils"

function parseRole(value: string | null): ConversationFilter {
  return CONVERSATION_FILTERS.find((filter) => filter === value) ?? "all"
}

/**
 * The inbox: conversations on the left and the open one on the right. On
 * phones only one of them shows at a time, chosen by `?c=`, so the browser's
 * back button goes from a conversation to the list.
 */
export function MessagesView() {
  const t = useTranslations("Messages")
  const { status } = useAuth()

  if (status === "loading") {
    return (
      <div className="flex h-full">
        <div className="flex w-full flex-col gap-3 p-4 md:w-80 md:border-r lg:w-96">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    )
  }

  if (status === "anonymous") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LogInIcon />
          </EmptyMedia>
          <EmptyTitle>{t("signInTitle")}</EmptyTitle>
          <EmptyDescription>{t("signInDescription")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="w-full max-w-xs">
          <GoogleSignInButton fullWidth />
        </EmptyContent>
      </Empty>
    )
  }

  return <Inbox />
}

function Inbox() {
  const t = useTranslations("Messages")
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("c")
  const role = parseRole(searchParams.get("role"))
  // The garden filter only applies to conversations about your gardens.
  const gardenId = role === "received" ? searchParams.get("garden") : null
  const list = useConversationList({ role, gardenId })
  const { refresh: refreshUnread } = useMessages()
  const { upsert } = list
  const onConversationChange = React.useCallback(
    (conversation: Conversation) => {
      upsert(conversation)
      // Reading or replying here changes the sidebar's unread counts.
      refreshUnread()
    },
    [upsert, refreshUnread]
  )

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cn(
          "min-h-0 w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r lg:w-96",
          conversationId ? "hidden" : "flex"
        )}
      >
        <ConversationList
          conversations={list.conversations}
          status={list.status}
          hasMore={list.hasMore}
          loadingMore={list.loadingMore}
          onLoadMore={list.loadMore}
          onRetry={list.retry}
          role={role}
          gardenId={gardenId}
          activeId={conversationId}
        />
      </aside>
      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          conversationId ? "flex" : "hidden md:flex"
        )}
      >
        {conversationId ? (
          <ConversationThread
            // A fresh thread per conversation: no state leaks between them.
            key={conversationId}
            conversationId={conversationId}
            backHref={messagesHref({ role, garden: gardenId })}
            onConversationChange={onConversationChange}
          />
        ) : (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessagesSquareIcon />
              </EmptyMedia>
              <EmptyTitle>{t("noSelectionTitle")}</EmptyTitle>
              <EmptyDescription>{t("noSelectionDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  )
}
