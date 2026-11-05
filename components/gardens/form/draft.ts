import type { DraftImage } from "@/components/gardens/use-image-uploads"
import type { Coordinates } from "@/components/map/location-picker"
import {
  isProductType,
  isProductUnit,
  type ProductType,
  type ProductUnit,
} from "@/lib/products"
import type { Garden, GardenInput } from "@/lib/types"

export const NAME_MAX = 80
export const DESCRIPTION_MAX = 500
export const PRODUCT_NAME_MAX = 60
export const PRODUCTS_MAX = 50

// The form's parts: steps when creating a garden on a phone, sections opened
// one at a time when editing one there, and one page on larger screens.
export const SECTIONS = ["info", "location", "products"] as const
export type Section = (typeof SECTIONS)[number]

export function isSection(value: string | null): value is Section {
  return (SECTIONS as readonly (string | null)[]).includes(value)
}

export interface ProductDraft {
  key: string
  name: string
  // Empty when the stored value isn't a known code: the user picks again.
  type: ProductType | ""
  quantity: string
  unit: ProductUnit | ""
  // The first one is the cover.
  images: DraftImage[]
}

export interface GardenDraft {
  name: string
  description: string
  active: boolean
  coordinates: Coordinates | null
  products: ProductDraft[]
}

// Message keys under `GardenForm.errors`, translated when rendered.
export type ErrorCode =
  | "nameRequired"
  | "descriptionTooLong"
  | "locationRequired"
  | "productNameRequired"
  | "typeRequired"
  | "unitRequired"
  | "quantityInvalid"
  | "imagesPending"
  | "geolocationUnsupported"
  | "geolocationFailed"

export type Errors = Partial<Record<string, ErrorCode>>

export function newProduct(): ProductDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    type: "vegetable",
    quantity: "1",
    unit: "unit",
    images: [],
  }
}

export function toDraft(garden?: Garden): GardenDraft {
  if (!garden) {
    return {
      name: "",
      description: "",
      active: true,
      coordinates: null,
      products: [],
    }
  }

  return {
    name: garden.name,
    description: garden.description,
    active: garden.active,
    coordinates: garden.location.coordinates,
    products: garden.products.map((product) => ({
      key: crypto.randomUUID(),
      name: product.name,
      type: isProductType(product.type) ? product.type : "",
      quantity: String(product.quantity),
      // Without a unit the quantity counts items.
      unit:
        product.unit === undefined
          ? "unit"
          : isProductUnit(product.unit)
            ? product.unit
            : "",
      images: product.images.map((image) => ({
        localId: image.id,
        id: image.id,
        url: image.thumbUrl,
        fullUrl: image.url,
        status: "done" as const,
        width: image.width,
        height: image.height,
      })),
    })),
  }
}

export function validate(draft: GardenDraft): Errors {
  const errors: Errors = {}

  if (!draft.name.trim()) {
    errors.name = "nameRequired"
  }
  if (draft.description.length > DESCRIPTION_MAX) {
    errors.description = "descriptionTooLong"
  }
  if (!draft.coordinates) {
    errors.location = "locationRequired"
  }
  draft.products.forEach((product) => {
    if (!product.name.trim()) {
      errors[`product.${product.key}.name`] = "productNameRequired"
    }
    if (!product.type) {
      errors[`product.${product.key}.type`] = "typeRequired"
    }
    if (!product.unit) {
      errors[`product.${product.key}.unit`] = "unitRequired"
    }
    const quantity = Number(product.quantity)
    if (product.quantity.trim() === "" || !(quantity >= 0)) {
      errors[`product.${product.key}.quantity`] = "quantityInvalid"
    }
    if (product.images.some((image) => image.status !== "done")) {
      errors[`product.${product.key}.images`] = "imagesPending"
    }
  })

  return errors
}

// The section an error key belongs to.
export function sectionOf(errorKey: string): Section {
  if (errorKey === "location") return "location"
  if (errorKey.startsWith("product.")) return "products"
  return "info"
}

// Only the errors of the given sections: each step shows its own once the user
// tries to leave it, not the ones of steps still ahead.
export function errorsIn(errors: Errors, sections: ReadonlySet<Section>) {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => sections.has(sectionOf(key)))
  ) as Errors
}

export function productHasErrors(errors: Errors, product: ProductDraft) {
  return Object.keys(errors).some((key) =>
    key.startsWith(`product.${product.key}.`)
  )
}

export function toInput(draft: GardenDraft): GardenInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    active: draft.active,
    location: { type: "Point", coordinates: draft.coordinates! },
    products: draft.products.map((product) => ({
      name: product.name.trim(),
      type: product.type,
      quantity: Number(product.quantity),
      unit: product.unit,
      images: product.images.map((image) => ({ id: image.id! })),
    })),
  }
}

// What the form would save, so drafts that differ only in whitespace or product
// keys compare equal.
export function snapshot(draft: GardenDraft) {
  return JSON.stringify({
    name: draft.name.trim(),
    description: draft.description.trim(),
    active: draft.active,
    coordinates: draft.coordinates,
    products: draft.products.map((product) => [
      product.name.trim(),
      product.type,
      product.quantity.trim(),
      product.unit,
      product.images.map((image) => image.id ?? image.localId),
    ]),
  })
}

// The part of `snapshot` a section edits, to tell which ones have changes.
export function sectionSnapshot(draft: GardenDraft, section: Section) {
  const all = JSON.parse(snapshot(draft))

  switch (section) {
    case "info":
      return JSON.stringify([all.name, all.description])
    case "location":
      return JSON.stringify(all.coordinates)
    case "products":
      return JSON.stringify(all.products)
  }
}

// What survives in the stored draft: blob URLs and unfinished uploads die
// with the page, so only uploaded photos are kept, with their public preview.
export function storableDraft(draft: GardenDraft): GardenDraft {
  return {
    ...draft,
    products: draft.products.map((product) => ({
      ...product,
      images: product.images
        .filter((image) => image.status === "done")
        .map((image) => ({
          ...image,
          url: image.previewUrl ?? image.url,
          fullUrl: image.fullUrl?.startsWith("blob:")
            ? undefined
            : image.fullUrl,
        })),
    })),
  }
}

// One step of the − / + buttons, kept to two decimals and never below zero.
export function stepQuantity(quantity: string, delta: 1 | -1) {
  const current = Number(quantity)
  const base = Number.isFinite(current) && current >= 0 ? current : 0
  const next = Math.max(0, Math.round((base + delta) * 100) / 100)
  return String(next)
}
