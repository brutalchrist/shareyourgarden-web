"use client"

import * as React from "react"
import { ClockIcon, SproutIcon, XIcon } from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"

import { ProductGallery } from "@/components/gardens/product-gallery"
import { ProductThumbnail } from "@/components/gardens/product-thumbnail"
import { ContactGarden } from "@/components/messages/contact-garden"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { useProductLabels } from "@/lib/products"
import type { Garden, Product } from "@/lib/types"

export function GardenDrawer({
  garden,
  onClose,
}: {
  garden: Garden | null
  onClose: () => void
}) {
  const t = useTranslations("GardenDrawer")
  const { formatQuantity, productTypeLabel } = useProductLabels()
  const isMobile = useIsMobile()

  // Keep showing the last garden while the drawer animates closed.
  const [displayed, setDisplayed] = React.useState(garden)
  // The product whose photos are open in the gallery.
  const [gallery, setGallery] = React.useState<Product | null>(null)
  if (garden && garden !== displayed) {
    setDisplayed(garden)
    setGallery(null)
  }

  return (
    <Drawer
      open={garden !== null}
      onOpenChange={(open) => !open && onClose()}
      // Bottom sheet on mobile. On larger screens a floating side panel that
      // keeps the map usable, so another marker can be selected without
      // closing it.
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
      modal={isMobile}
      disablePointerDismissal={!isMobile}
    >
      {/* Keep the width and inset in sync with DRAWER_WIDTH_REM in GardenMap. */}
      <DrawerContent className="data-[swipe-axis=x]:rounded-xl data-[swipe-axis=x]:border data-[swipe-axis=x]:shadow-xl data-[swipe-axis=x]:[--drawer-content-width:min(calc(100%-1.5rem),26rem)]! data-[swipe-axis=x]:[--drawer-inset:0.75rem]">
        {displayed && (
          <>
            <DrawerHeader className="relative gap-3 bg-linear-to-b from-brand/10 to-transparent p-5 pb-4 text-left! md:gap-3">
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">{t("close")}</span>
              </DrawerClose>
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand ring-1 ring-brand/25">
                <SproutIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-1.5 pr-8">
                <DrawerTitle className="text-xl leading-tight font-semibold text-balance">
                  {displayed.name}
                </DrawerTitle>
                <GardenMeta garden={displayed} />
              </div>
              {displayed.description && (
                <DrawerDescription className="text-left leading-relaxed text-pretty whitespace-pre-line">
                  {displayed.description}
                </DrawerDescription>
              )}
            </DrawerHeader>

            <Separator />

            <section
              aria-labelledby="garden-drawer-products"
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  id="garden-drawer-products"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {t("available")}
                </h3>
                {displayed.products.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("productCount", { count: displayed.products.length })}
                  </span>
                )}
              </div>
              {displayed.products.length === 0 ? (
                <Empty className="rounded-lg border border-dashed py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SproutIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t("noProducts")}</EmptyTitle>
                    <EmptyDescription>
                      {t("noProductsDescription")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ItemGroup className="gap-2">
                  {/* What's available first; sold out at the end. The sort is
                      stable, so the owner's order holds otherwise. */}
                  {[...displayed.products]
                    .sort(
                      (a, b) =>
                        Number(a.quantity === 0) - Number(b.quantity === 0)
                    )
                    .map((product, index) => (
                      <ProductItem
                        key={index}
                        product={product}
                        onOpenPhotos={() => setGallery(product)}
                      />
                    ))}
                </ItemGroup>
              )}
            </section>

            {/* Outside the scrolling list so it stays in view. */}
            <DrawerFooter className="border-t bg-muted/30 p-4">
              <ContactGarden key={displayed.id} garden={displayed} />
            </DrawerFooter>

            <ProductGallery
              open={gallery !== null}
              onOpenChange={(open) => !open && setGallery(null)}
              title={gallery?.name ?? ""}
              description={
                gallery
                  ? [
                      productTypeLabel(gallery.type),
                      formatQuantity(gallery.quantity, gallery.unit),
                      displayed.name,
                    ].join(" · ")
                  : undefined
              }
              images={(gallery?.images ?? []).map((image) => ({
                url: image.url,
                thumbUrl: image.thumbUrl,
                width: image.width,
                height: image.height,
              }))}
            />
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

// Who grows it and how fresh the listing is.
function GardenMeta({ garden }: { garden: Garden }) {
  const t = useTranslations("GardenDrawer")
  const format = useFormatter()
  // Re-renders every minute so "2 minutes ago" stays current.
  const now = useNow({ updateInterval: 60_000 })

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5">
        <Avatar size="sm">
          {garden.owner.picture && (
            <AvatarImage
              src={garden.owner.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback className="bg-brand/15 font-medium text-brand">
            {initial(garden.owner.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">
          {t("byOwner", { name: garden.owner.name })}
        </span>
      </span>
      {garden.updatedAt && (
        <span className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5" />
          {t("updated", {
            when: format.relativeTime(new Date(garden.updatedAt), now),
          })}
        </span>
      )}
    </div>
  )
}

function ProductItem({
  product,
  onOpenPhotos,
}: {
  product: Product
  onOpenPhotos: () => void
}) {
  const t = useTranslations("GardenDrawer")
  const { formatQuantity, productTypeLabel } = useProductLabels()
  const hasPhotos = product.images.length > 0

  return (
    <Item
      role="listitem"
      variant="outline"
      size="sm"
      className="relative bg-card has-[button:hover]:bg-muted/50"
    >
      {hasPhotos && (
        // Covers the row so the whole product opens its photos, while the
        // row stays a list item.
        <button
          type="button"
          onClick={onOpenPhotos}
          aria-label={t("openPhotos", {
            name: product.name,
            count: product.images.length,
          })}
          className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      )}
      <ItemMedia>
        <ProductThumbnail
          product={product}
          className="size-11 rounded-lg bg-brand/10 text-brand outline-0"
        />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle>{product.name}</ItemTitle>
        <ItemDescription>{productTypeLabel(product.type)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge
          variant={product.quantity === 0 ? "outline" : "secondary"}
          className="tabular-nums"
        >
          {formatQuantity(product.quantity, product.unit)}
        </Badge>
      </ItemActions>
    </Item>
  )
}

function initial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || "?"
}
