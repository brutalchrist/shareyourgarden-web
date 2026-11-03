"use client"

import { SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useMessages } from "@/components/messages/messages-provider"
import { useSearch } from "@/components/search-provider"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"

// Based on the `SiteHeader` from shadcn's dashboard-01 block.
export function AppHeader({
  showSidebarTrigger = false,
}: {
  showSidebarTrigger?: boolean
}) {
  const t = useTranslations("Header")
  const { searchText, setSearchText } = useSearch()
  const { summary } = useMessages()
  const unread = summary?.unread ?? 0

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger && (
          <>
            <div className="relative -ml-1">
              <SidebarTrigger
                aria-describedby={unread > 0 ? "unread-hint" : undefined}
              />
              {/* On phones the sidebar is hidden, so its unread counts are
                  hinted at on the button that opens it. */}
              {unread > 0 && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background md:hidden"
                  />
                  <span id="unread-hint" className="sr-only">
                    {t("unreadMessages", { count: unread })}
                  </span>
                </>
              )}
            </div>
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
          </>
        )}
        <h1 className="text-base font-medium">ShareYourGarden</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <InputGroup className="w-full max-w-[300px]">
            <InputGroupInput
              type="search"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
