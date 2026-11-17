"use client"

import * as React from "react"
import { ArrowRightIcon, SproutIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ButtonLink } from "@/components/button-link"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { track } from "@/lib/analytics"
import {
  dismissMapWelcome,
  isMapWelcomeDismissed,
  subscribeMapWelcome,
} from "@/lib/map-welcome"

// Whether this browser still has to see the welcome card. Prerendered pages
// show none; the browser decides after hydrating.
export function useMapWelcomePending() {
  return !React.useSyncExternalStore(
    subscribeMapWelcome,
    isMapWelcomeDismissed,
    () => true
  )
}

// For visitors who land on the map without knowing the project (a shared
// link, a search, the installed app): one line about what it is, with a way
// to the landing. Once closed, or followed, it doesn't come back.
export function MapWelcome() {
  const t = useTranslations("MapWelcome")

  React.useEffect(() => {
    track("map_welcome_shown")
  }, [])

  return (
    // The same floating surface as the empty state it stands in for.
    <div className="pointer-events-auto animate-in rounded-xl border bg-background/95 shadow-lg backdrop-blur fade-in-0 slide-in-from-top-2">
      <Item size="sm" className="flex-wrap">
        <ItemMedia className="size-9 rounded-full bg-brand/15 text-brand">
          <SproutIcon />
        </ItemMedia>
        <ItemContent className="min-w-0 basis-48">
          <ItemTitle>{t("title")}</ItemTitle>
          <ItemDescription>{t("description")}</ItemDescription>
        </ItemContent>
        <ItemActions className="ml-auto">
          <ButtonLink
            href="/"
            variant="outline"
            size="sm"
            onClick={() => {
              track("map_welcome_answered", { action: "learn_more" })
              dismissMapWelcome()
            }}
          >
            {t("learnMore")}
            <ArrowRightIcon data-icon="inline-end" />
          </ButtonLink>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("dismiss")}
            title={t("dismiss")}
            onClick={() => {
              track("map_welcome_answered", { action: "dismissed" })
              dismissMapWelcome()
            }}
          >
            <XIcon />
          </Button>
        </ItemActions>
      </Item>
    </div>
  )
}
