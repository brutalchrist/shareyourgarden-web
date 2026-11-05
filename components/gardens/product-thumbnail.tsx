"use client"

import * as React from "react"
import { SproutIcon } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
import { isProductType } from "@/lib/products"
import type { Product } from "@/lib/types"

/**
 * A product's cover photo, or the icon of its type on a muted square when it
 * has none (or the photo fails to load), so product lists stay aligned.
 */
export function ProductThumbnail({
  product,
  className,
}: {
  product: Pick<Product, "type" | "images">
  className?: string
}) {
  const cover = product.images[0]
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)
  const Icon = isProductType(product.type)
    ? PRODUCT_TYPE_ICONS[product.type]
    : SproutIcon
  const extra = product.images.length - 1

  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground outline outline-1 -outline-offset-1 outline-black/5 dark:outline-white/10",
        className
      )}
    >
      {cover && failedUrl !== cover.thumbUrl ? (
        // The site is a static export without an image server; thumbnails
        // are already resized before upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.thumbUrl}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(cover.thumbUrl)}
          className="size-full object-cover"
        />
      ) : (
        <Icon className="size-5" />
      )}
      {extra > 0 && (
        <Badge className="absolute right-0.5 bottom-0.5 h-4 bg-black/65 px-1 text-[10px] leading-none text-white">
          +{extra}
        </Badge>
      )}
    </span>
  )
}
