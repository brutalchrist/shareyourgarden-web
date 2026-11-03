"use client"

import { PlusIcon, SproutIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ButtonLink } from "@/components/button-link"

const NEW_GARDEN_HREF = "/gardens/new/"

// Shown over the map when the visible area has no gardens: an invitation to
// look elsewhere or to put the first one there.
export function MapEmptyState({ searchText }: { searchText: string }) {
  const t = useTranslations("GardenMap")
  const query = searchText.trim()

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-1000 flex justify-center">
      {/* The button wraps onto its own line on narrow screens. */}
      <div className="pointer-events-auto flex max-w-md animate-in flex-wrap items-center gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur fade-in-0 slide-in-from-top-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <SproutIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm font-medium">
            {query ? t("emptySearchTitle", { query }) : t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
        <ButtonLink href={NEW_GARDEN_HREF} size="sm" className="shrink-0">
          <PlusIcon />
          {t("emptyCta")}
        </ButtonLink>
      </div>
    </div>
  )
}
