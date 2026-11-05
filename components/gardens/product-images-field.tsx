"use client"

import * as React from "react"
import {
  EllipsisIcon,
  EyeIcon,
  ImagePlusIcon,
  Loader2Icon,
  RotateCcwIcon,
  StarIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { useFormatter, useTranslations } from "next-intl"

import { ProductGallery } from "@/components/gardens/product-gallery"
import type { DraftImage } from "@/components/gardens/use-image-uploads"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FieldError } from "@/components/ui/field"
import { PRODUCT_IMAGES_MAX } from "@/lib/products"
import { isFinalImageError } from "@/lib/uploads"

// Three cards plus their gaps fit a phone-width product row.
const CARD_CLASS =
  "w-23 text-xs has-data-[slot=attachment-content]:w-23 sm:w-30 sm:text-sm sm:has-data-[slot=attachment-content]:w-30"

const ACTION_CLASS =
  "bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"

/**
 * The photos of one product in the garden form: up to three `Attachment`
 * cards plus a dashed one to add more. The first photo is the cover.
 */
export function ProductImagesField({
  productName,
  images,
  dragging,
  error,
  onAdd,
  onRemove,
  onRetry,
  onMakeCover,
  onExpired,
}: {
  // Already falls back to "Producto 2" when the name is empty.
  productName: string
  images: DraftImage[]
  // Photos are being dragged over the product.
  dragging: boolean
  error?: string
  onAdd: (files: File[]) => void
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
  onMakeCover: (localId: string) => void
  // A restored draft's photo whose temporary upload is gone.
  onExpired: (localId: string) => void
}) {
  const t = useTranslations("GardenForm.photos")
  const format = useFormatter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [galleryIndex, setGalleryIndex] = React.useState<number | null>(null)
  const remaining = PRODUCT_IMAGES_MAX - images.length
  const doneImages = images.filter((image) => image.status === "done")

  function details(image: DraftImage) {
    if (image.status === "processing") return t("processing")
    if (image.status === "uploading") return t("uploading")
    if (image.status === "error") return t(`errors.${image.error ?? "failed"}`)
    if (image.size && image.contentType) {
      return t("details", {
        format: image.contentType === "image/webp" ? "WebP" : "JPEG",
        size: format.number(image.size / 1000, {
          style: "unit",
          unit: "kilobyte",
          maximumFractionDigits: 0,
        }),
      })
    }
    if (image.width && image.height) {
      return t("dimensions", { width: image.width, height: image.height })
    }
    return undefined
  }

  return (
    <div className="flex flex-col gap-2">
      <AttachmentGroup
        role="group"
        aria-label={t("group", { name: productName })}
        // Focused by the form when the photos block saving.
        data-focus-invalid={!!error || undefined}
        tabIndex={error ? -1 : undefined}
        className="-mx-1 gap-2 px-1 outline-none sm:gap-3"
      >
        {images.map((image, index) => {
          const number = index + 1
          const label = { number, name: productName }
          const isError = image.status === "error"
          const canRetry =
            isError && !isFinalImageError(image.error ?? "failed")

          return (
            <Attachment
              key={image.localId}
              state={image.status}
              orientation="vertical"
              className={CARD_CLASS}
            >
              <AttachmentMedia variant={isError ? "icon" : "image"}>
                {isError ? (
                  <TriangleAlertIcon />
                ) : (
                  // Blob URLs or bucket thumbnails: there is no image server.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={t("photoAlt", label)}
                    onError={() => {
                      // Only drafts point at temporary uploads that can expire.
                      if (image.status === "done" && image.previewUrl) {
                        onExpired(image.localId)
                      }
                    }}
                  />
                )}
                {index === 0 && image.status === "done" && (
                  <Badge className="absolute bottom-1.5 left-1.5 h-4 gap-0.5 bg-black/65 px-1.5 text-[10px] text-white">
                    <StarIcon />
                    {t("cover")}
                  </Badge>
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle title={image.name}>
                  {isError && image.name ? image.name : t("photo", { number })}
                </AttachmentTitle>
                <AttachmentDescription
                  className={
                    isError ? "line-clamp-4 whitespace-normal" : undefined
                  }
                >
                  {image.status === "uploading" && (
                    <Loader2Icon className="mr-1 inline size-3 animate-spin" />
                  )}
                  {details(image)}
                </AttachmentDescription>
              </AttachmentContent>
              {image.status === "done" && (
                <AttachmentTrigger
                  aria-label={t("view", label)}
                  onClick={() => setGalleryIndex(doneImages.indexOf(image))}
                />
              )}
              <AttachmentActions>
                {canRetry && (
                  <AttachmentAction
                    className={ACTION_CLASS}
                    aria-label={t("retry", label)}
                    onClick={() => onRetry(image.localId)}
                  >
                    <RotateCcwIcon />
                  </AttachmentAction>
                )}
                {image.status === "done" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <AttachmentAction
                          className={ACTION_CLASS}
                          aria-label={t("more", label)}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-48" align="end">
                      {index > 0 && (
                        <DropdownMenuItem
                          onClick={() => onMakeCover(image.localId)}
                        >
                          <StarIcon />
                          {t("makeCover")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          setGalleryIndex(doneImages.indexOf(image))
                        }
                      >
                        <EyeIcon />
                        {t("viewShort")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <AttachmentAction
                  className={ACTION_CLASS}
                  aria-label={t("remove", label)}
                  onClick={() => onRemove(image.localId)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          )
        })}

        {remaining > 0 && (
          <Attachment
            state="idle"
            orientation="vertical"
            className={cn(
              CARD_CLASS,
              dragging
                ? "border-primary/60 bg-muted"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AttachmentMedia className="bg-transparent">
              {dragging ? <UploadIcon /> : <ImagePlusIcon />}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle className="text-foreground">
                {dragging ? t("dropShort") : t("add")}
              </AttachmentTitle>
              <AttachmentDescription>
                {t("count", {
                  count: images.length,
                  max: PRODUCT_IMAGES_MAX,
                })}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              aria-label={t("addLabel", {
                name: productName,
                count: images.length,
                max: PRODUCT_IMAGES_MAX,
              })}
              onClick={() => inputRef.current?.click()}
            />
          </Attachment>
        )}
      </AttachmentGroup>

      {/* The add card's trigger opens it. On phones it offers the camera or
          the photo library. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ""
          if (files.length > 0) onAdd(files)
        }}
      />

      <FieldError>{error}</FieldError>

      <ProductGallery
        open={galleryIndex !== null}
        onOpenChange={(open) => !open && setGalleryIndex(null)}
        startIndex={galleryIndex ?? 0}
        title={productName}
        images={doneImages.map((image) => ({
          url: image.fullUrl ?? image.url,
          thumbUrl: image.url,
          width: image.width,
          height: image.height,
        }))}
      />
    </div>
  )
}
