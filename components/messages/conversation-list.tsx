"use client"

import * as React from "react"
import {
  InboxIcon,
  LockIcon,
  MapIcon,
  MessageCircleIcon,
  RotateCwIcon,
  SproutIcon,
} from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"

import { useMyGardens } from "@/components/my-gardens-provider"
import { ParticipantAvatar } from "@/components/messages/participant-avatar"
import type { ConversationListStatus } from "@/components/messages/use-conversation-list"
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Link, useRouter } from "@/i18n/navigation"
import {
  CONVERSATION_FILTERS,
  messagesHref,
  type ConversationFilter,
} from "@/lib/conversations"
import type { Conversation } from "@/lib/types"
import { cn } from "@/lib/utils"

const ALL_GARDENS = "all"

export function ConversationList({
  conversations,
  status,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
  role,
  gardenId,
  activeId,
}: {
  conversations: Conversation[]
  status: ConversationListStatus
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRetry: () => void
  role: ConversationFilter
  gardenId: string | null
  activeId: string | null
}) {
  const t = useTranslations("Messages")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <Filters role={role} gardenId={gardenId} activeId={activeId} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" ? (
          <ConversationListSkeleton />
        ) : status === "error" ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("loadError")}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onRetry}>
                <RotateCwIcon data-icon="inline-start" />
                {t("retry")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : conversations.length === 0 ? (
          <EmptyInbox filtered={role !== "all" || !!gardenId} />
        ) : (
          <>
            <ItemGroup className="gap-0.5 p-2">
              {conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === activeId}
                  href={messagesHref({
                    role,
                    garden: gardenId,
                    conversation: conversation.id,
                  })}
                />
              ))}
            </ItemGroup>
            {hasMore && (
              <div className="flex justify-center p-2 pb-4">
                <Button
                  variant="ghost"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore && <Spinner data-icon="inline-start" />}
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Filters({
  role,
  gardenId,
  activeId,
}: {
  role: ConversationFilter
  gardenId: string | null
  activeId: string | null
}) {
  const t = useTranslations("Messages")
  const router = useRouter()
  const { gardens } = useMyGardens()

  const go = (next: { role: ConversationFilter; garden: string | null }) =>
    router.replace(messagesHref({ ...next, conversation: activeId }))

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        className="w-full"
        value={[role]}
        onValueChange={(value: string[]) => {
          // Clicking the selected filter again keeps it selected.
          const next = CONVERSATION_FILTERS.find(
            (filter) => filter === value[0]
          )
          if (next && next !== role) {
            go({ role: next, garden: next === "received" ? gardenId : null })
          }
        }}
        aria-label={t("filterLabel")}
      >
        {CONVERSATION_FILTERS.map((filter) => (
          <ToggleGroupItem key={filter} value={filter} className="flex-1">
            {t(`filter.${filter}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Telling gardens apart only matters with more than one. */}
      {role === "received" && gardens.length > 1 && (
        <Select<string>
          value={gardenId ?? ALL_GARDENS}
          onValueChange={(value) =>
            go({
              role,
              garden: value && value !== ALL_GARDENS ? value : null,
            })
          }
        >
          <SelectTrigger className="w-full" aria-label={t("gardenFilter")}>
            <SelectValue>
              {(value: string | null) =>
                !value || value === ALL_GARDENS
                  ? t("allGardens")
                  : (gardens.find((garden) => garden.id === value)?.name ??
                    t("allGardens"))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GARDENS}>{t("allGardens")}</SelectItem>
            {gardens.map((garden) => (
              <SelectItem key={garden.id} value={garden.id}>
                {garden.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function ConversationRow({
  conversation,
  active,
  href,
}: {
  conversation: Conversation
  active: boolean
  href: string
}) {
  const t = useTranslations("Messages")
  const { lastMessage } = conversation
  const unread = conversation.unreadCount > 0
  const mine = lastMessage?.senderId !== conversation.otherUser.id

  return (
    <Item
      size="sm"
      render={<Link href={href} aria-current={active ? "page" : undefined} />}
      className={cn("items-start", active && "bg-muted")}
    >
      <ItemMedia className="relative">
        <ParticipantAvatar
          participant={conversation.otherUser}
          className="size-10"
        />
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-primary">
            <span className="sr-only">
              {t("unread", { count: conversation.unreadCount })}
            </span>
          </span>
        )}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <div className="flex items-baseline gap-2">
          <ItemTitle className={cn("truncate", unread && "font-semibold")}>
            {conversation.otherUser.name}
          </ItemTitle>
          {conversation.readOnly && (
            <LockIcon
              className="size-3 shrink-0 text-muted-foreground"
              aria-label={t("readOnlyLabel")}
            />
          )}
          {lastMessage && (
            <ListTime
              date={new Date(lastMessage.createdAt)}
              className={cn(
                "ml-auto shrink-0 text-xs text-muted-foreground",
                unread && "font-medium text-foreground"
              )}
            />
          )}
        </div>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <SproutIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {conversation.productName
              ? t("gardenWithProduct", {
                  garden: conversation.gardenName,
                  product: conversation.productName,
                })
              : conversation.gardenName}
          </span>
        </span>
        {lastMessage && (
          <ItemDescription
            className={cn(
              "line-clamp-1",
              unread && "font-medium text-foreground"
            )}
          >
            {mine
              ? t("youWrote", { body: lastMessage.body })
              : lastMessage.body}
          </ItemDescription>
        )}
      </ItemContent>
    </Item>
  )
}

// Time today, weekday this week, date otherwise; like most messaging apps.
function ListTime({ date, className }: { date: Date; className?: string }) {
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const days = (now.getTime() - date.getTime()) / 86_400_000
  const sameDay = now.toDateString() === date.toDateString()

  return (
    <time dateTime={date.toISOString()} className={className}>
      {sameDay
        ? format.dateTime(date, { hour: "numeric", minute: "2-digit" })
        : days < 6
          ? format.dateTime(date, { weekday: "short" })
          : format.dateTime(date, {
              day: "numeric",
              month: "short",
              ...(date.getFullYear() !== now.getFullYear()
                ? { year: "numeric" }
                : {}),
            })}
    </time>
  )
}

function EmptyInbox({ filtered }: { filtered: boolean }) {
  const t = useTranslations("Messages")

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {filtered ? <InboxIcon /> : <MessageCircleIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {filtered ? t("emptyFilteredTitle") : t("emptyTitle")}
        </EmptyTitle>
        <EmptyDescription>
          {filtered ? t("emptyFilteredDescription") : t("emptyDescription")}
        </EmptyDescription>
      </EmptyHeader>
      {!filtered && (
        <EmptyContent>
          <ButtonLink variant="outline" href="/map/">
            <MapIcon data-icon="inline-start" />
            {t("exploreMap")}
          </ButtonLink>
        </EmptyContent>
      )}
    </Empty>
  )
}

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
