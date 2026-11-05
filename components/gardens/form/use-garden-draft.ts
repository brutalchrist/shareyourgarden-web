"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  errorsIn,
  newProduct,
  SECTIONS,
  snapshot,
  storableDraft,
  toDraft,
  validate,
  type ErrorCode,
  type GardenDraft,
  type ProductDraft,
  type Section,
} from "@/components/gardens/form/draft"
import {
  useImageUploads,
  type DraftImage,
} from "@/components/gardens/use-image-uploads"
import {
  discardGardenDraft,
  loadGardenDraft,
  saveGardenDraft,
} from "@/lib/garden-drafts"
import { PRODUCT_IMAGES_MAX } from "@/lib/products"
import type { Garden } from "@/lib/types"

const ALL_SECTIONS: ReadonlySet<Section> = new Set(SECTIONS)

function isImageFile(file: File) {
  // HEIC photos sometimes come without a type; processing tells if they work.
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)
}

// The garden being created or edited, whichever way the form lays it out:
// the draft, its changes against the saved garden and the actions on it.
export function useGardenDraft(garden?: Garden) {
  const t = useTranslations("GardenForm")
  const savedSnapshot = React.useMemo(() => snapshot(toDraft(garden)), [garden])
  // Pick up changes left unsaved when the user navigated away.
  const [initial] = React.useState(() => {
    const restored = loadGardenDraft<GardenDraft>(garden?.id, savedSnapshot)
    return { draft: restored ?? toDraft(garden), restored: !!restored }
  })
  const [draft, setDraft] = React.useState(initial.draft)
  const [restored, setRestored] = React.useState(initial.restored)
  // Errors show per section once the user tries to leave or save it, then
  // update as they type. An existing garden with values the form can't show
  // (types saved before the codes) points them out right away.
  const [checked, setChecked] = React.useState<ReadonlySet<Section>>(() =>
    garden && Object.keys(validate(initial.draft)).length > 0
      ? ALL_SECTIONS
      : new Set()
  )
  const [locating, setLocating] = React.useState(false)
  const [locateError, setLocateError] = React.useState<ErrorCode | null>(null)

  // The baseline follows the saved garden, so a save clears the changes.
  const changed = snapshot(draft) !== savedSnapshot

  React.useEffect(() => {
    if (changed) {
      saveGardenDraft(garden?.id, savedSnapshot, storableDraft(draft))
    } else {
      discardGardenDraft(garden?.id)
    }
  }, [changed, draft, garden?.id, savedSnapshot])

  const allErrors = validate(draft)
  const errors = errorsIn(allErrors, checked)

  // Shows the errors of these sections (all of them by default) and tells
  // whether there are any.
  function check(sections: readonly Section[] = SECTIONS) {
    setChecked((current) => new Set([...current, ...sections]))
    return Object.keys(errorsIn(allErrors, new Set(sections))).length === 0
  }

  function discardChanges() {
    setDraft(toDraft(garden))
    setRestored(false)
    setChecked(new Set())
  }

  function patch(changes: Partial<GardenDraft>) {
    setDraft((draft) => ({ ...draft, ...changes }))
  }

  function patchProduct(key: string, changes: Partial<ProductDraft>) {
    setDraft((draft) => ({
      ...draft,
      products: draft.products.map((product) =>
        product.key === key ? { ...product, ...changes } : product
      ),
    }))
  }

  // Focus the new row's name once it renders.
  const focusProductKey = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!focusProductKey.current) return
    document.getElementById(`product-${focusProductKey.current}-name`)?.focus()
    focusProductKey.current = null
  }, [draft.products])

  function addProduct() {
    const product = newProduct()
    setDraft((draft) => ({ ...draft, products: [...draft.products, product] }))
    focusProductKey.current = product.key
    return product.key
  }

  const updateImage = React.useCallback(
    (localId: string, changes: Partial<DraftImage>) =>
      setDraft((draft) => ({
        ...draft,
        products: draft.products.map((product) =>
          product.images.some((image) => image.localId === localId)
            ? {
                ...product,
                images: product.images.map((image) =>
                  image.localId === localId ? { ...image, ...changes } : image
                ),
              }
            : product
        ),
      })),
    []
  )
  const uploads = useImageUploads(updateImage)

  function removeProduct(key: string) {
    draft.products
      .find((product) => product.key === key)
      ?.images.forEach((image) => uploads.cancel(image.localId))
    setDraft((draft) => ({
      ...draft,
      products: draft.products.filter((product) => product.key !== key),
    }))
  }

  function patchImages(
    key: string,
    change: (images: DraftImage[]) => DraftImage[]
  ) {
    setDraft((draft) => ({
      ...draft,
      products: draft.products.map((product) =>
        product.key === key
          ? { ...product, images: change(product.images) }
          : product
      ),
    }))
  }

  function addImages(product: ProductDraft, files: File[]) {
    const images = files.filter(isImageFile)
    if (images.length < files.length) {
      toast.error(t("photos.notImage"))
    }
    const remaining = PRODUCT_IMAGES_MAX - product.images.length
    if (images.length === 0) return
    if (remaining <= 0) {
      toast.error(t("photos.full", { max: PRODUCT_IMAGES_MAX }))
      return
    }
    if (images.length > remaining) {
      toast.warning(
        t("photos.tooManyFiles", { max: PRODUCT_IMAGES_MAX, count: remaining })
      )
    }
    const added = images.slice(0, remaining).map(uploads.add)
    patchImages(product.key, (current) => [...current, ...added])
  }

  function removeImage(product: ProductDraft, localId: string, name: string) {
    const index = product.images.findIndex((image) => image.localId === localId)
    const image = product.images[index]
    if (!image) return

    uploads.cancel(localId)
    patchImages(product.key, (images) =>
      images.filter((other) => other.localId !== localId)
    )
    // Only a finished upload can come back; nothing is deleted until saving.
    if (image.status === "done") {
      toast(t("photos.removed", { name }), {
        action: {
          label: t("photos.undo"),
          onClick: () =>
            patchImages(product.key, (images) =>
              images.length >= PRODUCT_IMAGES_MAX ||
              images.some((other) => other.localId === localId)
                ? images
                : [...images.slice(0, index), image, ...images.slice(index)]
            ),
        },
      })
    }
  }

  function makeCover(product: ProductDraft, localId: string) {
    patchImages(product.key, (images) => [
      ...images.filter((image) => image.localId === localId),
      ...images.filter((image) => image.localId !== localId),
    ])
  }

  function expireImage(product: ProductDraft, localId: string) {
    patchImages(product.key, (images) =>
      images.filter((image) => image.localId !== localId)
    )
    toast.warning(t("photos.expired"))
  }

  const uploading = draft.products.some((product) =>
    product.images.some(
      (image) => image.status === "processing" || image.status === "uploading"
    )
  )

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError("geolocationUnsupported")
      return
    }

    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        patch({
          coordinates: [position.coords.longitude, position.coords.latitude],
        })
      },
      () => {
        setLocating(false)
        setLocateError("geolocationFailed")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return {
    draft,
    patch,
    changed,
    restored,
    discardChanges,
    errors,
    allErrors,
    check,
    products: {
      patch: patchProduct,
      add: addProduct,
      remove: removeProduct,
    },
    images: {
      add: addImages,
      remove: removeImage,
      retry: uploads.retry,
      makeCover,
      expire: expireImage,
    },
    uploading,
    location: {
      locating,
      error: locateError,
      clearError: () => setLocateError(null),
      locateMe,
    },
  }
}

export type GardenDraftState = ReturnType<typeof useGardenDraft>
