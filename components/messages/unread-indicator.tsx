"use client"

import { useTranslations } from "next-intl"

import { formatUnread } from "@/components/messages/messages-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Unread count for a sidebar menu button: a small pill when the sidebar is
 * expanded and a dot over the icon when it is collapsed to icons. The menu
 * button needs `relative` for the dot.
 */
export function UnreadIndicator({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  const t = useTranslations("Messages")

  if (count <= 0) {
    return null
  }

  return (
    <>
      {/* Says what the number counts; screen readers get the sr-only text. */}
      <Tooltip>
        <TooltipTrigger
          render={<span aria-hidden />}
          className={cn(
            "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums group-data-[collapsible=icon]:hidden",
            className
          )}
        >
          {formatUnread(count)}
        </TooltipTrigger>
        <TooltipContent side="right">
          {t("unreadConversations", { count })}
        </TooltipContent>
      </Tooltip>
      <span
        aria-hidden
        className="absolute top-1 right-1 hidden size-2 rounded-full bg-primary ring-2 ring-sidebar group-data-[collapsible=icon]:block"
      />
      <span className="sr-only">{t("unreadConversations", { count })}</span>
    </>
  )
}
