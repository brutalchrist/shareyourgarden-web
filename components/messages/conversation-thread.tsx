"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  CircleAlertIcon,
  MapPinIcon,
  MessageCircleOffIcon,
  SproutIcon,
} from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import {
  ConversationActionsMenu,
  ReadOnlyNotice,
} from "@/components/messages/conversation-safety"
import { MessageComposer } from "@/components/messages/message-composer"
import { ParticipantAvatar } from "@/components/messages/participant-avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerVisibility,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { usePageVisible } from "@/hooks/use-page-visible"
import { usePushMessages } from "@/hooks/use-push"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"
import {
  getConversation,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/conversations"
import { getGarden, gardenMapHref } from "@/lib/gardens"
import {
  buildThreadItems,
  type ThreadItem,
  type ThreadMessage,
} from "@/lib/thread-items"
import type { Conversation, Garden, Message as ApiMessage } from "@/lib/types"

// The open thread polls quickly and slows down while nothing arrives.
const POLL_MIN_MS = 4_000
const POLL_MAX_MS = 15_000

type ThreadStatus = "loading" | "ready" | "not-found" | "error"

const fromApi = (message: ApiMessage): ThreadMessage => ({
  id: message.id,
  key: message.id,
  senderId: message.senderId,
  body: message.body,
  createdAt: new Date(message.createdAt),
  status: "sent",
})

// Appends server messages that are not shown yet, oldest first.
function addMessages(current: ThreadMessage[], incoming: ThreadMessage[]) {
  const known = new Set(current.map((message) => message.id))
  const added = incoming.filter((message) => !known.has(message.id))
  if (added.length === 0) return current
  return [...current, ...added].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )
}

export function ConversationThread({
  conversationId,
  backHref,
  onConversationChange,
}: {
  conversationId: string
  backHref: string
  // Keeps the inbox in sync with what happens here.
  onConversationChange: (conversation: Conversation) => void
}) {
  const t = useTranslations("Messages")
  const { user } = useAuth()
  const visible = usePageVisible()
  const [status, setStatus] = React.useState<ThreadStatus>("loading")
  const [attempt, setAttempt] = React.useState(0)
  const [conversation, setConversation] = React.useState<Conversation | null>(
    null
  )
  // Server messages, plus the ones being sent from this tab.
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [pending, setPending] = React.useState<ThreadMessage[]>([])
  const [hasOlder, setHasOlder] = React.useState(false)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  // undefined while loading; null when the garden is gone.
  const [garden, setGarden] = React.useState<Garden | null | undefined>()

  const onChangeRef = React.useRef(onConversationChange)
  React.useEffect(() => {
    onChangeRef.current = onConversationChange
  })
  const conversationRef = React.useRef(conversation)
  React.useEffect(() => {
    conversationRef.current = conversation
  })
  const updateConversation = React.useCallback((next: Conversation) => {
    setConversation(next)
    onChangeRef.current(next)
  }, [])

  // First load.
  React.useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      getConversation(conversationId, controller.signal),
      listMessages(conversationId, {}, controller.signal),
    ])
      .then(([loaded, page]) => {
        setConversation(loaded)
        setMessages(page.messages.map(fromApi))
        setHasOlder(page.hasMore)
        setStatus("ready")

        getGarden(loaded.gardenId)
          .then(setGarden)
          .catch(() => setGarden(null))
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error(error)
        setStatus(
          error instanceof ApiError && error.status === 404
            ? "not-found"
            : "error"
        )
      })

    return () => controller.abort()
  }, [conversationId, attempt])

  // Polling for new messages and for the other side's read receipt.
  const lastServerId = messages.at(-1)?.id
  const lastServerIdRef = React.useRef(lastServerId)
  React.useEffect(() => {
    lastServerIdRef.current = lastServerId
  })

  // Polls right away when a push says this conversation has a new message.
  const pollNowRef = React.useRef<() => void>(undefined)
  usePushMessages((id) => {
    if (id === conversationId) pollNowRef.current?.()
  })

  React.useEffect(() => {
    if (status !== "ready" || !visible) {
      return
    }

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = POLL_MIN_MS

    const poll = async () => {
      try {
        const [page, latest] = await Promise.all([
          listMessages(
            conversationId,
            { after: lastServerIdRef.current },
            controller.signal
          ),
          getConversation(conversationId, controller.signal),
        ])
        const incoming = page.messages.map(fromApi)
        setMessages((current) => addMessages(current, incoming))
        setConversation(latest)
        if (incoming.length > 0) onChangeRef.current(latest)
        delay =
          incoming.length > 0
            ? POLL_MIN_MS
            : Math.min(POLL_MAX_MS, Math.round(delay * 1.5))
      } catch (error) {
        if (controller.signal.aborted) return
        console.error(error)
        delay = POLL_MAX_MS
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, delay)
    }

    // Also restarts when the tab comes back to the front.
    timer = setTimeout(poll, POLL_MIN_MS)
    pollNowRef.current = () => {
      clearTimeout(timer)
      delay = POLL_MIN_MS
      poll()
    }

    return () => {
      controller.abort()
      clearTimeout(timer)
      pollNowRef.current = undefined
    }
  }, [conversationId, status, visible])

  const loadOlder = React.useCallback(async () => {
    const oldest = messages[0]
    if (!oldest || loadingOlder || !hasOlder) return

    setLoadingOlder(true)
    try {
      const page = await listMessages(conversationId, { before: oldest.id })
      setMessages((current) => addMessages(current, page.messages.map(fromApi)))
      setHasOlder(page.hasMore)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, hasOlder, loadingOlder, messages])

  const reloadConversation = React.useCallback(async () => {
    try {
      updateConversation(await getConversation(conversationId))
    } catch (error) {
      console.error(error)
    }
  }, [conversationId, updateConversation])

  const send = React.useCallback(
    async (body: string, retryKey?: string) => {
      if (!user) return

      const key = retryKey ?? `pending-${crypto.randomUUID()}`
      const draft: ThreadMessage = {
        id: key,
        key,
        senderId: user.id,
        body,
        createdAt: new Date(),
        status: "sending",
      }
      setPending((current) => [
        ...current.filter((message) => message.key !== key),
        draft,
      ])

      try {
        const sent = await sendMessage(conversationId, body)
        setPending((current) =>
          current.filter((message) => message.key !== key)
        )
        // Keep the temporary key so the bubble is not remounted.
        setMessages((current) =>
          addMessages(current, [{ ...fromApi(sent), key }])
        )
        const current = conversationRef.current
        if (current) {
          updateConversation({
            ...current,
            lastMessage: {
              body: sent.body,
              senderId: sent.senderId,
              createdAt: sent.createdAt,
            },
            unreadCount: 0,
          })
        }
      } catch (error) {
        console.error(error)
        setPending((current) =>
          current.map((message) =>
            message.key === key ? { ...message, status: "failed" } : message
          )
        )
        if (error instanceof ApiError) {
          if (error.code === "TOO_MANY_MESSAGES") {
            toast.error(t("tooManyMessages"))
          } else if (
            error.code === "USER_BLOCKED" ||
            error.code === "CONVERSATION_CLOSED"
          ) {
            // It became read-only meanwhile: show why instead of the composer.
            void reloadConversation()
          }
        }
      }
    },
    [conversationId, user, updateConversation, reloadConversation, t]
  )

  const markRead = React.useCallback(async () => {
    try {
      await markConversationRead(conversationId)
      const current = conversationRef.current
      if (current) updateConversation({ ...current, unreadCount: 0 })
    } catch (error) {
      console.error(error)
    }
  }, [conversationId, updateConversation])

  if (status === "loading") {
    return <ThreadSkeleton />
  }

  if (status !== "ready" || !conversation || !user) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {status === "not-found" ? (
              <MessageCircleOffIcon />
            ) : (
              <CircleAlertIcon />
            )}
          </EmptyMedia>
          <EmptyTitle>
            {status === "not-found" ? t("notFoundTitle") : t("loadError")}
          </EmptyTitle>
          {status === "not-found" && (
            <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
          )}
        </EmptyHeader>
        <EmptyContent>
          {status === "not-found" ? (
            <ButtonLink variant="outline" href={backHref}>
              {t("backToInbox")}
            </ButtonLink>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setStatus("loading")
                setAttempt((value) => value + 1)
              }}
            >
              {t("retry")}
            </Button>
          )}
        </EmptyContent>
      </Empty>
    )
  }

  // Pending messages go last, after everything the server has.
  const items = buildThreadItems([...messages, ...pending], user.id)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ThreadHeader
        conversation={conversation}
        garden={garden}
        backHref={backHref}
        onConversationChanged={reloadConversation}
      />
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport
            preserveScrollOnPrepend
            aria-label={t("threadLabel", {
              name: conversation.otherUser.name,
            })}
          >
            <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-1 p-4">
              {hasOlder && (
                <OlderMessagesLoader
                  loading={loadingOlder}
                  onVisible={loadOlder}
                />
              )}
              <ThreadItems
                items={items}
                conversation={conversation}
                onRetry={(message) => send(message.body, message.key)}
              />
              {garden === null &&
                conversation.readOnly !== "garden-deleted" && (
                  <MessageScrollerItem>
                    <Marker variant="separator" className="pt-4">
                      <MarkerContent>{t("gardenGone")}</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton>
            <ArrowDownIcon />
            <span className="sr-only">{t("scrollToEnd")}</span>
          </MessageScrollerButton>
        </MessageScroller>
        <ReadTracker
          items={items}
          conversation={conversation}
          visible={visible}
          onRead={markRead}
        />
        <div className="border-t bg-background p-3 md:p-4">
          <div className="mx-auto max-w-3xl">
            {conversation.readOnly ? (
              <ReadOnlyNotice
                conversation={conversation}
                onChanged={reloadConversation}
              />
            ) : (
              <ComposerWithScroll onSend={(body) => send(body)} />
            )}
          </div>
        </div>
      </MessageScrollerProvider>
    </div>
  )
}

function ComposerWithScroll({ onSend }: { onSend: (body: string) => void }) {
  const { scrollToEnd } = useMessageScroller()

  return (
    <MessageComposer
      onSend={(body) => {
        onSend(body)
        // Sending from anywhere in the history jumps to your message.
        requestAnimationFrame(() => scrollToEnd({ behavior: "smooth" }))
      }}
    />
  )
}

function ThreadHeader({
  conversation,
  garden,
  backHref,
  onConversationChanged,
}: {
  conversation: Conversation
  garden: Garden | null | undefined
  backHref: string
  onConversationChanged: () => Promise<void>
}) {
  const t = useTranslations("Messages")

  return (
    <header className="flex items-center gap-3 border-b px-3 py-2.5 md:px-4">
      <ButtonLink
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        href={backHref}
      >
        <ArrowLeftIcon />
        <span className="sr-only">{t("backToInbox")}</span>
      </ButtonLink>
      <ParticipantAvatar participant={conversation.otherUser} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-medium">{conversation.otherUser.name}</h2>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <SproutIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {conversation.productName
              ? t("gardenWithProduct", {
                  garden: conversation.gardenName,
                  product: conversation.productName,
                })
              : conversation.gardenName}
          </span>
          <span className="shrink-0">
            ·{" "}
            {conversation.role === "owner"
              ? t("aboutYourGarden")
              : t("aboutTheirGarden")}
          </span>
        </p>
      </div>
      {garden && (
        <ButtonLink variant="outline" size="sm" href={gardenMapHref(garden)}>
          <MapPinIcon data-icon="inline-start" />
          <span className="max-sm:sr-only">{t("viewOnMap")}</span>
        </ButtonLink>
      )}
      <ConversationActionsMenu
        conversation={conversation}
        onChanged={onConversationChanged}
      />
    </header>
  )
}

function ThreadItems({
  items,
  conversation,
  onRetry,
}: {
  items: ThreadItem[]
  conversation: Conversation
  onRetry: (message: ThreadMessage) => void
}) {
  const t = useTranslations("Messages")
  const format = useFormatter()
  const lastItem = items.at(-1)
  const otherLastReadAt = conversation.otherLastReadAt
    ? new Date(conversation.otherLastReadAt)
    : null

  return items.map((item) => {
    if (item.type === "day") {
      return (
        <MessageScrollerItem key={item.key} className="py-3">
          <Marker variant="separator">
            <MarkerContent>
              <DayLabel date={item.date} />
            </MarkerContent>
          </Marker>
        </MessageScrollerItem>
      )
    }

    const { message, mine } = item
    // "Seen" only under the last message, when it is yours.
    const seen =
      mine &&
      item === lastItem &&
      message.status === "sent" &&
      !!otherLastReadAt &&
      otherLastReadAt >= message.createdAt
    const time = format.dateTime(message.createdAt, {
      hour: "numeric",
      minute: "2-digit",
    })

    return (
      <MessageScrollerItem
        key={item.key}
        messageId={item.key}
        scrollAnchor={mine}
        className={item.firstOfGroup ? "pt-3" : undefined}
      >
        <Message align={mine ? "end" : "start"}>
          {!mine && (
            <MessageAvatar className="bg-transparent">
              {item.lastOfGroup ? (
                <ParticipantAvatar participant={conversation.otherUser} />
              ) : (
                <span className="size-8" />
              )}
            </MessageAvatar>
          )}
          <MessageContent className="gap-1">
            <Bubble
              align={mine ? "end" : "start"}
              variant={
                message.status === "failed"
                  ? "destructive"
                  : mine
                    ? "default"
                    : "muted"
              }
              className={message.status === "sending" ? "opacity-70" : ""}
            >
              <BubbleContent className="whitespace-pre-wrap">
                <span className="sr-only">
                  {mine ? t("you") : conversation.otherUser.name} {time}:{" "}
                </span>
                {message.body}
              </BubbleContent>
            </Bubble>
            {message.status === "failed" ? (
              <MessageFooter className="gap-1 text-destructive">
                {t("notSent")} ·
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto p-0 text-destructive"
                  onClick={() => onRetry(message)}
                >
                  {t("retrySend")}
                </Button>
              </MessageFooter>
            ) : message.status === "sending" ? (
              item.lastOfGroup && (
                <MessageFooter aria-live="polite">{t("sending")}</MessageFooter>
              )
            ) : (
              item.lastOfGroup && (
                <MessageFooter aria-hidden>
                  {seen ? t("seen", { time }) : time}
                </MessageFooter>
              )
            )}
          </MessageContent>
        </Message>
      </MessageScrollerItem>
    )
  })
}

function DayLabel({ date }: { date: Date }) {
  const t = useTranslations("Messages")
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) return t("today")
  if (date.toDateString() === yesterday.toDateString()) return t("yesterday")
  return format.dateTime(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  })
}

// Marks the conversation as read once the other side's latest message has
// actually been on screen with the tab in front, not just when it opens.
function ReadTracker({
  items,
  conversation,
  visible,
  onRead,
}: {
  items: ThreadItem[]
  conversation: Conversation
  visible: boolean
  onRead: () => void
}) {
  const { visibleMessageIds } = useMessageScrollerVisibility()
  const lastFromOther = items.findLast(
    (item) => item.type === "message" && !item.mine
  )
  const markedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (
      !visible ||
      !lastFromOther ||
      conversation.unreadCount === 0 ||
      markedRef.current === lastFromOther.key ||
      !visibleMessageIds.includes(lastFromOther.key)
    ) {
      return
    }
    markedRef.current = lastFromOther.key
    onRead()
  }, [
    visible,
    lastFromOther,
    conversation.unreadCount,
    visibleMessageIds,
    onRead,
  ])

  return null
}

function OlderMessagesLoader({
  loading,
  onVisible,
}: {
  loading: boolean
  onVisible: () => void
}) {
  const t = useTranslations("Messages")
  const ref = React.useRef<HTMLDivElement>(null)
  const onVisibleRef = React.useRef(onVisible)
  React.useEffect(() => {
    onVisibleRef.current = onVisible
  })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onVisibleRef.current()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <MessageScrollerItem>
      <div ref={ref}>
        <Marker role="status" className="justify-center py-2">
          {loading && (
            <MarkerIcon>
              <Spinner aria-hidden />
            </MarkerIcon>
          )}
          <MarkerContent>
            {loading ? t("loadingOlder") : t("olderMessages")}
          </MarkerContent>
        </Marker>
      </div>
    </MessageScrollerItem>
  )
}

function ThreadSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-3 p-4">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-10 w-1/2 self-end rounded-xl" />
        <Skeleton className="h-16 w-3/5 rounded-xl" />
      </div>
    </div>
  )
}
