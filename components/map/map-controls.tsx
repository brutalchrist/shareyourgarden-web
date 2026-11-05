"use client"

import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  locating,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onLocate: () => void
  locating: boolean
}) {
  const t = useTranslations("MapControls")

  return (
    // Bottom right, within thumb reach, on mobile. Bottom left on larger
    // screens, where the garden drawer opens on the right over the map.
    <div className="absolute right-3 bottom-8 z-1000 flex flex-col gap-2 md:right-auto md:left-3">
      <Button
        variant="outline"
        size="icon"
        className="bg-background shadow-md dark:bg-background"
        onClick={onLocate}
        disabled={locating}
        aria-label={t("locate")}
        title={t("locate")}
      >
        {locating ? <Spinner /> : <LocateFixedIcon />}
      </Button>
      <div className="flex flex-col overflow-hidden rounded-md border bg-background shadow-md">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none"
          onClick={onZoomIn}
          aria-label={t("zoomIn")}
          title={t("zoomIn")}
        >
          <PlusIcon />
        </Button>
        <div className="mx-2 h-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none"
          onClick={onZoomOut}
          aria-label={t("zoomOut")}
          title={t("zoomOut")}
        >
          <MinusIcon />
        </Button>
      </div>
    </div>
  )
}
