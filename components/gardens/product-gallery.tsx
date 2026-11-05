"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "cn"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

export interface GalleryImage {
  url: string
  thumbUrl: string
  width?: number
  height?: number
}

/**
 * Full-screen viewer for a product's photos: swipe on touch screens, arrows
 * and keyboard on larger ones, and a strip of thumbnails to jump between them.
 */
export function ProductGallery({
  images,
  open,
  onOpenChange,
  startIndex = 0,
  title,
  description,
}: {
  images: GalleryImage[]
  open: boolean
  onOpenChange: (open: boolean) => void
  startIndex?: number
  title: string
  description?: string
}) {
  const t = useTranslations("ProductGallery")
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(startIndex)

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      api?.scrollPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      api?.scrollNext()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={handleKeyDown}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        <div className="flex items-center justify-between p-4">
          <span
            aria-live="polite"
            className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium tabular-nums"
          >
            {t("counter", { current: current + 1, total: images.length })}
          </span>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
              />
            }
          >
            <XIcon />
            <span className="sr-only">{t("close")}</span>
          </DialogClose>
        </div>

        <div className="flex min-h-0 flex-1 items-center">
          {open && (
            <Carousel
              opts={{ startIndex }}
              setApi={setApi}
              className="mx-auto w-full max-w-3xl"
              aria-label={title}
            >
              <CarouselContent className="ml-0">
                {images.map((image, index) => (
                  <CarouselItem
                    key={image.url}
                    aria-label={t("photo", {
                      number: index + 1,
                      total: images.length,
                    })}
                    className="flex items-center justify-center pl-0"
                  >
                    {/* The site is a static export without an image server;
                        photos are already resized before upload. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={t("photoAlt", { number: index + 1, name: title })}
                      width={image.width || undefined}
                      height={image.height || undefined}
                      decoding="async"
                      className="max-h-[65dvh] w-auto max-w-full object-contain md:rounded-xl"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious
                    variant="secondary"
                    size="icon"
                    aria-label={t("previous")}
                    className="left-4 hidden md:inline-flex"
                  />
                  <CarouselNext
                    variant="secondary"
                    size="icon"
                    aria-label={t("next")}
                    className="right-4 hidden md:inline-flex"
                  />
                </>
              )}
            </Carousel>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div>
            <DialogTitle className="text-base font-semibold text-white">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-white/70">
                {description}
              </DialogDescription>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  aria-label={t("goTo", { number: index + 1 })}
                  aria-current={index === current || undefined}
                  className={cn(
                    "size-12 overflow-hidden rounded-md opacity-50 outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-white",
                    index === current && "opacity-100 outline-2 outline-white"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
