"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  PRODUCT_NAME_MAX,
  PRODUCTS_MAX,
  productHasErrors,
  stepQuantity,
  type Errors,
  type ProductDraft,
} from "@/components/gardens/form/draft"
import { useErrorMessage } from "@/components/gardens/form/sections"
import type { GardenDraftState } from "@/components/gardens/form/use-garden-draft"
import { ProductImagesField } from "@/components/gardens/product-images-field"
import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  PRODUCT_IMAGES_MAX,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  useProductLabels,
  type ProductType,
  type ProductUnit,
} from "@/lib/products"

export const PRODUCTS_SECTION_ID = "garden-products"

export function ProductsSection({
  form,
  compact = false,
}: {
  form: GardenDraftState
  // On phones: one line per product, with − / + for the quantity, opened to
  // edit the rest.
  compact?: boolean
}) {
  const t = useTranslations("GardenForm")
  const { draft, errors, products } = form
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )

  function toggle(key: string, open: boolean) {
    setExpanded((current) => {
      const next = new Set(current)
      if (open) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function add() {
    toggle(products.add(), true)
  }

  return (
    <FieldSet id={PRODUCTS_SECTION_ID} className="scroll-mt-4">
      <FieldLegend>{t("products")}</FieldLegend>
      <FieldDescription>{t("productsDescription")}</FieldDescription>
      <FieldDescription className="flex items-start gap-1.5">
        <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
        {t("photos.help", { max: PRODUCT_IMAGES_MAX })}
      </FieldDescription>
      {draft.products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
          <Button type="button" variant="outline" onClick={add}>
            <PlusIcon />
            {t("addProduct")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {draft.products.map((product, index) =>
            compact ? (
              <ProductCard
                key={product.key}
                index={index}
                product={product}
                form={form}
                // A product with errors stays open, so they can be fixed.
                open={
                  expanded.has(product.key) || productHasErrors(errors, product)
                }
                onOpenChange={(open) => toggle(product.key, open)}
              />
            ) : (
              <ProductRow
                key={product.key}
                index={index}
                product={product}
                form={form}
              />
            )
          )}
          {draft.products.length < PRODUCTS_MAX && (
            <Button
              type="button"
              variant="outline"
              className={cn(
                compact ? "h-12 w-full border-dashed" : "self-start"
              )}
              onClick={add}
            >
              <PlusIcon />
              {t("addProduct")}
            </Button>
          )}
        </div>
      )}
    </FieldSet>
  )
}

function ProductCard({
  index,
  product,
  form,
  open,
  onOpenChange,
}: {
  index: number
  product: ProductDraft
  form: GardenDraftState
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("GardenForm")
  const { productTypeLabel, productUnitLabel } = useProductLabels()
  const invalid = productHasErrors(form.errors, product)
  const name = product.name.trim() || t("productGroup", { number: index + 1 })
  const quantity = Number(product.quantity)
  const soldOut = product.quantity.trim() !== "" && quantity === 0
  const detailsId = `product-${product.key}-details`

  if (open) {
    return (
      <div id={detailsId} className="flex flex-col gap-2">
        <ProductRow index={index} product={product} form={form} />
        {!invalid && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end"
            onClick={() => onOpenChange(false)}
            aria-expanded
            aria-controls={detailsId}
          >
            {t("productDone")}
          </Button>
        )}
      </div>
    )
  }

  const cover = product.images[0]
  const TypeIcon = product.type ? PRODUCT_TYPE_ICONS[product.type] : null
  const details = [
    product.type ? productTypeLabel(product.type) : null,
    product.unit ? productUnitLabel(product.unit) : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-2.5 transition-opacity",
        soldOut && "bg-muted/40"
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onOpenChange(true)}
        aria-expanded={false}
        aria-controls={detailsId}
        aria-label={t("editProduct", { name })}
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand/10 text-brand",
            soldOut && "opacity-60 grayscale"
          )}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer
            <img src={cover.url} alt="" className="size-full object-cover" />
          ) : (
            TypeIcon && <TypeIcon className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {soldOut ? (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {t("soldOut")}
              </span>
            ) : (
              details
            )}
          </span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <QuantityStepper
        name={name}
        quantity={product.quantity}
        onChange={(quantity) => form.products.patch(product.key, { quantity })}
      />
    </div>
  )
}

function QuantityStepper({
  name,
  quantity,
  onChange,
}: {
  name: string
  quantity: string
  onChange: (quantity: string) => void
}) {
  const t = useTranslations("GardenForm")
  const value = Number(quantity)
  const valid = quantity.trim() !== "" && value >= 0

  return (
    <div
      role="group"
      aria-label={t("quantityOf", { name })}
      className="flex shrink-0 items-center rounded-full border"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => onChange(stepQuantity(quantity, -1))}
        disabled={valid && value <= 0}
        aria-label={t("decrease", { name })}
      >
        <MinusIcon />
      </Button>
      <output
        aria-live="polite"
        className="min-w-8 text-center text-sm font-semibold tabular-nums"
      >
        {valid ? quantity : "–"}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => onChange(stepQuantity(quantity, 1))}
        aria-label={t("increase", { name })}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

function ProductRow({
  index,
  product,
  form,
}: {
  index: number
  product: ProductDraft
  form: GardenDraftState
}) {
  const t = useTranslations("GardenForm")
  const errorMessage = useErrorMessage()
  const { productUnitLabel } = useProductLabels()
  const errors: Errors = form.errors
  const onChange = (changes: Partial<ProductDraft>) =>
    form.products.patch(product.key, changes)
  const id = `product-${product.key}`
  const nameError = errorMessage(errors[`product.${product.key}.name`])
  const quantityError = errorMessage(errors[`product.${product.key}.quantity`])
  const typeError = errorMessage(errors[`product.${product.key}.type`])
  const unitError = errorMessage(errors[`product.${product.key}.unit`])
  const imagesError = errorMessage(errors[`product.${product.key}.images`])
  const productName =
    product.name.trim() || t("productGroup", { number: index + 1 })
  // Counts nested dragenter/dragleave pairs so children don't flicker it.
  const dragDepth = React.useRef(0)
  const [dragging, setDragging] = React.useState(false)
  const canAddImages = product.images.length < PRODUCT_IMAGES_MAX
  const hasFiles = (event: React.DragEvent) =>
    event.dataTransfer.types.includes("Files")
  const onAddImages = (files: File[]) => form.images.add(product, files)

  return (
    <div
      role="group"
      aria-label={t("productGroup", { number: index + 1 })}
      onDragEnter={(event) => {
        if (!hasFiles(event) || !canAddImages) return
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event) || !canAddImages) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        onAddImages([...event.dataTransfer.files])
      }}
      data-dragging={dragging || undefined}
      className="relative grid grid-cols-2 gap-3 rounded-md border p-3 pr-11 transition-shadow data-dragging:border-transparent data-dragging:bg-muted/40 data-dragging:ring-2 data-dragging:ring-primary/40 sm:grid-cols-[minmax(0,1fr)_9.5rem_6rem_8rem]"
    >
      <Field
        data-invalid={!!nameError || undefined}
        className="col-span-2 sm:col-span-1"
      >
        <FieldLabel htmlFor={`${id}-name`}>{t("product")}</FieldLabel>
        <Input
          id={`${id}-name`}
          value={product.name}
          onChange={(event) => onChange({ name: event.target.value })}
          maxLength={PRODUCT_NAME_MAX}
          placeholder={t("productPlaceholder")}
          autoComplete="off"
          aria-invalid={!!nameError || undefined}
        />
        <FieldError>{nameError}</FieldError>
      </Field>
      <Field
        data-invalid={!!typeError || undefined}
        className="col-span-2 sm:col-span-1"
      >
        <FieldLabel htmlFor={`${id}-type`}>{t("type")}</FieldLabel>
        <Select<ProductType>
          value={product.type || null}
          onValueChange={(type) => type && onChange({ type })}
        >
          <SelectTrigger
            id={`${id}-type`}
            className="w-full"
            aria-invalid={!!typeError || undefined}
          >
            {/* A render function replaces the placeholder, so it handles
                the empty value itself. */}
            <SelectValue>
              {(type: ProductType | null) =>
                type ? <ProductTypeOption type={type} /> : t("chooseType")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <ProductTypeOption type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{typeError}</FieldError>
      </Field>
      <Field data-invalid={!!quantityError || undefined}>
        <FieldLabel htmlFor={`${id}-quantity`}>{t("quantity")}</FieldLabel>
        <Input
          id={`${id}-quantity`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={product.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          aria-invalid={!!quantityError || undefined}
        />
        <FieldError>{quantityError}</FieldError>
      </Field>
      <Field data-invalid={!!unitError || undefined}>
        <FieldLabel htmlFor={`${id}-unit`}>{t("unit")}</FieldLabel>
        <Select<ProductUnit>
          value={product.unit || null}
          onValueChange={(unit) => unit && onChange({ unit })}
        >
          <SelectTrigger
            id={`${id}-unit`}
            className="w-full"
            aria-invalid={!!unitError || undefined}
          >
            <SelectValue>
              {(unit: ProductUnit | null) =>
                unit ? productUnitLabel(unit) : t("chooseUnit")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {productUnitLabel(unit)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{unitError}</FieldError>
      </Field>
      <div className="col-span-full">
        <ProductImagesField
          productName={productName}
          images={product.images}
          dragging={dragging}
          error={imagesError}
          onAdd={onAddImages}
          onRemove={(localId) =>
            form.images.remove(product, localId, productName)
          }
          onRetry={form.images.retry}
          onMakeCover={(localId) => form.images.makeCover(product, localId)}
          onExpired={(localId) => form.images.expire(product, localId)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
        onClick={() => form.products.remove(product.key)}
        aria-label={
          product.name
            ? t("remove", { name: product.name })
            : t("removeNumbered", { number: index + 1 })
        }
      >
        <XIcon />
      </Button>
    </div>
  )
}

function ProductTypeOption({ type }: { type: ProductType }) {
  const { productTypeLabel } = useProductLabels()
  const Icon = PRODUCT_TYPE_ICONS[type]

  return (
    <>
      <Icon className="text-muted-foreground" />
      {productTypeLabel(type)}
    </>
  )
}
