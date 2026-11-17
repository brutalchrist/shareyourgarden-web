"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  analyticsEnabled,
  getConsent,
  identifyUser,
  setConsent,
  subscribeConsent,
  type Consent,
} from "@/lib/analytics"

export function useConsent(): Consent {
  return React.useSyncExternalStore(
    subscribeConsent,
    getConsent,
    // Prerendered pages show no banner; the browser decides after hydrating.
    () => "granted"
  )
}

// The consent banner, and the link between a signed-in user and their
// events once they accept.
export function Analytics() {
  const consent = useConsent()
  const { user } = useAuth()

  React.useEffect(() => {
    if (user && consent === "granted") identifyUser(user.id)
  }, [user, consent])

  if (!analyticsEnabled || consent !== "pending") {
    return null
  }

  return <ConsentBanner />
}

function ConsentBanner() {
  const t = useTranslations("Analytics")

  return (
    // Bottom left on larger screens, clear of the map's garden drawer on the
    // right; across the bottom on phones.
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-50 rounded-lg bg-popover shadow-lg md:right-auto md:w-md"
    >
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{t("title")}</ItemTitle>
          <ItemDescription className="line-clamp-none">
            {t("description")}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="basis-full justify-end">
          <Button variant="outline" onClick={() => setConsent(false)}>
            {t("reject")}
          </Button>
          <Button onClick={() => setConsent(true)}>{t("accept")}</Button>
        </ItemActions>
      </Item>
    </div>
  )
}
