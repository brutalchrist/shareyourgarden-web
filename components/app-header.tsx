"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { PlusIcon, SproutIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { BetaBadge } from "@/components/beta-badge"
import { ButtonLink } from "@/components/button-link"
import { useMessages } from "@/components/messages/messages-provider"
import { useMyGardens } from "@/components/my-gardens-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"
import { Link, usePathname } from "@/i18n/navigation"

const NEW_GARDEN_HREF = "/gardens/new/"

// Based on the `SiteHeader` from shadcn's dashboard-01 block. Signed-in users
// see the app's name in the sidebar, so the header names the page instead;
// visitors, without a sidebar, get the brand.
export function AppHeader({
  showSidebarTrigger = false,
}: {
  showSidebarTrigger?: boolean
}) {
  const t = useTranslations("Header")
  const pathname = usePathname()
  const { summary } = useMessages()
  const unread = summary?.unread ?? 0

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger ? (
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
            {/* The garden being edited comes from the query string, only
                known in the browser for these statically exported pages. */}
            <React.Suspense>
              <PageBreadcrumb />
            </React.Suspense>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/map"
              className="flex min-w-0 items-center gap-2 rounded-md font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <SproutIcon className="size-4" />
              </span>
              <span className="truncate font-heading font-semibold">
                ShareYourGarden
              </span>
            </Link>
            {/* Beside the link, not in it: it's a button of its own. */}
            <BetaBadge />
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showSidebarTrigger && pathname.startsWith("/map") && (
            <ButtonLink
              href={NEW_GARDEN_HREF}
              variant="outline"
              size="sm"
              aria-label={t("shareGarden")}
            >
              <PlusIcon />
              <span className="hidden sm:inline">{t("shareGarden")}</span>
            </ButtonLink>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

// Where the signed-in user is: the section, and the garden for its pages.
function PageBreadcrumb() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tSidebar = useTranslations("Sidebar")
  const tGardens = useTranslations("MyGardens")
  const tEdit = useTranslations("EditGarden")
  const { gardens } = useMyGardens()

  let trail: string[] = []

  if (pathname.startsWith("/map")) {
    trail = [tSidebar("map")]
  } else if (pathname.startsWith("/messages")) {
    trail = [tSidebar("messages")]
  } else if (pathname.startsWith("/gardens/new")) {
    trail = [tGardens("title"), tGardens("newGarden")]
  } else if (pathname.startsWith("/gardens/edit")) {
    const id = searchParams.get("id")
    const garden = gardens.find((garden) => garden.id === id)
    trail = [tGardens("title"), garden?.name ?? tEdit("title")]
  }

  if (trail.length === 0) {
    return null
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((label, i) => {
          const last = i === trail.length - 1

          return (
            <React.Fragment key={i}>
              {/* Only the page itself on phones, where room is short. */}
              <BreadcrumbItem
                className={last ? "min-w-0" : "hidden md:inline-flex"}
              >
                {last ? (
                  <BreadcrumbPage className="truncate font-medium">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  label
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator className="hidden md:block" />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
