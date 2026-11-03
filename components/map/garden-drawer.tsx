"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { useProductLabels } from "@/lib/products"
import type { Garden } from "@/lib/types"

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
  if (garden && garden !== displayed) {
    setDisplayed(garden)
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.products.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground"
                        >
                          {t("noProducts")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayed.products.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>
                            {productTypeLabel(product.type)}
                          </TableCell>
                          <TableCell>
                            {formatQuantity(product.quantity, product.unit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="owner">
                <h3 className="mb-3 font-medium">{t("ownerInfo")}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">{t("name")}</dt>
                  <dd>{displayed.owner.name}</dd>
                  <dt className="text-muted-foreground">{t("email")}</dt>
                  <dd>{displayed.owner.email}</dd>
                </dl>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
