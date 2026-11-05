"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ProductGallery } from "@/components/gardens/product-gallery"
import { ProductThumbnail } from "@/components/gardens/product-thumbnail"
import { ContactGarden } from "@/components/messages/contact-garden"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
      // Bottom sheet on mobile. On larger screens a side panel that keeps the
      // map usable, so another marker can be selected without closing it.
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
      modal={isMobile}
      disablePointerDismissal={!isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:[--drawer-content-width:min(100%,40rem)]!">
        {displayed && (
          <>
            <DrawerHeader className="flex-row items-center justify-between gap-2 text-left">
              <DrawerTitle>{displayed.name}</DrawerTitle>
              <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">{t("close")}</span>
              </DrawerClose>
            </DrawerHeader>
            {displayed.description && (
              <p className="px-4 text-sm whitespace-pre-line text-muted-foreground">
                {displayed.description}
              </p>
            )}
            <Tabs
              defaultValue="products"
              className="w-full overflow-y-auto p-4"
            >
              <TabsList>
                <TabsTrigger value="products">{t("products")}</TabsTrigger>
                <TabsTrigger value="owner">{t("owner")}</TabsTrigger>
              </TabsList>
              <TabsContent value="products">
                {displayed.products.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("noProducts")}
                  </p>
                ) : (
                  <ItemGroup className="-mx-2 gap-0.5">
                    {displayed.products.map((product, index) => {
                      const hasPhotos = product.images.length > 0

                      return (
                        <Item
                          key={index}
                          size="sm"
                          className="px-2 py-2 [button]:text-left [button]:hover:bg-muted/60"
                          // Rows with photos open them; the rest are plain.
                          render={
                            hasPhotos ? (
                              <button
                                type="button"
                                onClick={() => setGallery(product)}
                              />
                            ) : undefined
                          }
                        >
                          <ItemMedia>
                            <ProductThumbnail product={product} />
                          </ItemMedia>
                          <ItemContent className="min-w-0 gap-0.5">
                            <ItemTitle>{product.name}</ItemTitle>
                            <ItemDescription>
                              {productTypeLabel(product.type)}
                              {hasPhotos && (
                                <span className="sr-only">
                                  {" · "}
                                  {t("viewPhotos", {
                                    count: product.images.length,
                                  })}
                                </span>
                              )}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions className="text-sm tabular-nums">
                            {formatQuantity(product.quantity, product.unit)}
                          </ItemActions>
                        </Item>
                      )
                    })}
                  </ItemGroup>
                )}
              </TabsContent>
              <TabsContent value="owner">
                <h3 className="mb-3 font-medium">{t("ownerInfo")}</h3>
                {/* The email is private: visitors write through the button below. */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">{t("name")}</dt>
                  <dd>{displayed.owner.name}</dd>
                </dl>
              </TabsContent>
            </Tabs>
            {/* Outside the scrolling tabs so it stays in view. */}
            <DrawerFooter className="border-t pt-4">
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
