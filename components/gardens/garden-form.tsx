"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  HistoryIcon,
  Loader2Icon,
  LocateFixedIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import { AddressSearch } from "@/components/map/address-search"
import type { Coordinates } from "@/components/map/location-picker"
import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/user-avatar"
import {
  discardGardenDraft,
  loadGardenDraft,
  saveGardenDraft,
} from "@/lib/garden-drafts"
import {
  isProductType,
  isProductUnit,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  useProductLabels,
  type ProductType,
  type ProductUnit,
} from "@/lib/products"
import type { Garden, GardenInput } from "@/lib/types"

// MapLibre needs `window` and WebGL, so the picker only renders on the client.
const LocationPicker = dynamic(
  () => import("@/components/map/location-picker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full rounded-md sm:h-80" />,
  }
)

const NAME_MAX = 80
const DESCRIPTION_MAX = 500
const PRODUCT_NAME_MAX = 60
const PRODUCTS_MAX = 50

interface ProductDraft {
  key: string
  name: string
  // Empty when the stored value isn't a known code: the user picks again.
  type: ProductType | ""
  quantity: string
  unit: ProductUnit | ""
}

interface GardenDraft {
  name: string
  description: string
  active: boolean
  coordinates: Coordinates | null
  products: ProductDraft[]
}

// Message keys under `GardenForm.errors`, translated when rendered.
type ErrorCode =
  | "nameRequired"
  | "descriptionTooLong"
  | "locationRequired"
  | "productNameRequired"
  | "typeRequired"
  | "unitRequired"
  | "quantityInvalid"
  | "geolocationUnsupported"
  | "geolocationFailed"

type Errors = Partial<Record<string, ErrorCode>>

function newProduct(): ProductDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    type: "vegetable",
    quantity: "1",
    unit: "unit",
  }
}

function toDraft(garden?: Garden): GardenDraft {
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
    })),
  }
}

function validate(draft: GardenDraft): Errors {
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
  })

  return errors
}

function toInput(draft: GardenDraft): GardenInput {
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
    })),
  }
}

// What the form would save, so drafts that differ only in whitespace or product
// keys compare equal.
function snapshot(draft: GardenDraft) {
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
    ]),
  })
}

export function GardenForm({
  garden,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: {
  garden?: Garden
  submitLabel: string
  onSubmit: (input: GardenInput) => Promise<void>
  onCancel: () => void
  extraActions?: React.ReactNode
}) {
  const t = useTranslations("GardenForm")
  const errorMessage = useErrorMessage()
  const { user } = useAuth()
  const savedSnapshot = React.useMemo(() => snapshot(toDraft(garden)), [garden])
  // Pick up changes left unsaved when the user navigated away.
  const [initial] = React.useState(() => {
    const restored = loadGardenDraft<GardenDraft>(garden?.id, savedSnapshot)
    return { draft: restored ?? toDraft(garden), restored: !!restored }
  })
  const [draft, setDraft] = React.useState(initial.draft)
  const [restored, setRestored] = React.useState(initial.restored)
  // An existing garden with values the form can't show (types saved before
  // the codes) points them out right away instead of waiting for a save.
  const [submitted, setSubmitted] = React.useState(
    () => !!garden && Object.keys(validate(initial.draft)).length > 0
  )
  const [pending, setPending] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const [locateError, setLocateError] = React.useState<ErrorCode | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // The baseline follows the saved garden, so a save clears the changes.
  const changed = snapshot(draft) !== savedSnapshot

  React.useEffect(() => {
    if (changed) {
      saveGardenDraft(garden?.id, savedSnapshot, draft)
    } else {
      discardGardenDraft(garden?.id)
    }
  }, [changed, draft, garden?.id, savedSnapshot])

  function discardChanges() {
    setDraft(toDraft(garden))
    setRestored(false)
    setSubmitted(false)
  }

  // Errors show once the user tries to save, then update as they type.
  const errors = submitted ? validate(draft) : {}

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

  function addProduct() {
    const product = newProduct()
    setDraft((draft) => ({ ...draft, products: [...draft.products, product] }))
    focusProductKey.current = product.key
  }

  // Focus the new row's name once it renders.
  const focusProductKey = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!focusProductKey.current) return
    document.getElementById(`product-${focusProductKey.current}-name`)?.focus()
    focusProductKey.current = null
  }, [draft.products])

  function removeProduct(key: string) {
    setDraft((draft) => ({
      ...draft,
      products: draft.products.filter((product) => product.key !== key),
    }))
  }

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)

    if (Object.keys(validate(draft)).length > 0) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus()
      )
      return
    }

    setPending(true)
    try {
      await onSubmit(toInput(draft))
    } finally {
      setPending(false)
    }
  }

  const [lng, lat] = draft.coordinates ?? []

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-full flex-col"
    >
      <FieldGroup className="flex-1 p-4 md:p-6">
        {restored && changed && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
          >
            <HistoryIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("restored")}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardChanges}
            >
              {t("discard")}
            </Button>
          </div>
        )}
        <FieldSet>
          <FieldLegend>{t("info")}</FieldLegend>
          <FieldDescription>{t("infoDescription")}</FieldDescription>
          <FieldGroup>
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="garden-name">{t("name")}</FieldLabel>
              <Input
                id="garden-name"
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                maxLength={NAME_MAX}
                placeholder={t("namePlaceholder")}
                autoComplete="off"
                aria-invalid={!!errors.name || undefined}
                autoFocus={!garden}
              />
              <FieldError>{errorMessage(errors.name)}</FieldError>
            </Field>
            <Field data-invalid={!!errors.description || undefined}>
              <FieldLabel htmlFor="garden-description">
                {t("description")}
                <span className="font-normal text-muted-foreground">
                  {t("optional")}
                </span>
              </FieldLabel>
              <Textarea
                id="garden-description"
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                placeholder={t("descriptionPlaceholder")}
                aria-invalid={!!errors.description || undefined}
              />
              <FieldDescription className="text-right tabular-nums">
                {draft.description.length}/{DESCRIPTION_MAX}
              </FieldDescription>
              <FieldError>{errorMessage(errors.description)}</FieldError>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="garden-active">{t("visible")}</FieldLabel>
                <FieldDescription>{t("visibleDescription")}</FieldDescription>
              </FieldContent>
              <Switch
                id="garden-active"
                checked={draft.active}
                onCheckedChange={(active) => patch({ active })}
              />
            </Field>
            {user && (
              <Field orientation="horizontal">
                <UserAvatar user={user} />
                <FieldContent>
                  <FieldTitle>
                    {t("publishedBy", { name: user.name ?? user.email })}
                  </FieldTitle>
                  <FieldDescription>{t("contactNotice")}</FieldDescription>
                </FieldContent>
              </Field>
            )}
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t("location")}</FieldLegend>
          <FieldDescription>{t("locationDescription")}</FieldDescription>
          <Field>
            <AddressSearch
              near={draft.coordinates}
              onSelect={(place) => {
                setLocateError(null)
                patch({ coordinates: place.coordinates })
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={locateMe}
                disabled={locating}
              >
                {locating ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <LocateFixedIcon />
                )}
                {t("useMyLocation")}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {draft.coordinates
                  ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`
                  : t("noLocation")}
              </span>
            </div>
            <LocationPicker
              value={draft.coordinates}
              onChange={(coordinates) => patch({ coordinates })}
              invalid={!!errors.location}
            />
            <FieldError>
              {errorMessage(errors.location ?? locateError ?? undefined)}
            </FieldError>
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t("products")}</FieldLegend>
          <FieldDescription>{t("productsDescription")}</FieldDescription>
          {draft.products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
              <Button type="button" variant="outline" onClick={addProduct}>
                <PlusIcon />
                {t("addProduct")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {draft.products.map((product, index) => (
                <ProductRow
                  key={product.key}
                  index={index}
                  product={product}
                  errors={errors}
                  onChange={(changes) => patchProduct(product.key, changes)}
                  onRemove={() => removeProduct(product.key)}
                />
              ))}
              {draft.products.length < PRODUCTS_MAX && (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={addProduct}
                >
                  <PlusIcon />
                  {t("addProduct")}
                </Button>
              )}
            </div>
          )}
        </FieldSet>
      </FieldGroup>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
        {extraActions}
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              // Cancelling is a choice to drop the changes, unlike navigating
              // away.
              discardGardenDraft(garden?.id)
              onCancel()
            }}
            disabled={pending}
          >
            {t("cancel")}
          </Button>
          {/* Saving an existing garden only makes sense once something
              changed; a new one shows what's missing instead. */}
          <Button type="submit" disabled={pending || (!!garden && !changed)}>
            {pending && <Loader2Icon className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

function ProductRow({
  index,
  product,
  errors,
  onChange,
  onRemove,
}: {
  index: number
  product: ProductDraft
  errors: Errors
  onChange: (changes: Partial<ProductDraft>) => void
  onRemove: () => void
}) {
  const t = useTranslations("GardenForm")
  const errorMessage = useErrorMessage()
  const { productUnitLabel } = useProductLabels()
  const id = `product-${product.key}`
  const nameError = errorMessage(errors[`product.${product.key}.name`])
  const quantityError = errorMessage(errors[`product.${product.key}.quantity`])
  const typeError = errorMessage(errors[`product.${product.key}.type`])
  const unitError = errorMessage(errors[`product.${product.key}.unit`])

  return (
    <div
      role="group"
      aria-label={t("productGroup", { number: index + 1 })}
      className="relative grid grid-cols-2 gap-3 rounded-md border p-3 pr-11 sm:grid-cols-[minmax(0,1fr)_9.5rem_6rem_8rem]"
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
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

function useErrorMessage() {
  const t = useTranslations("GardenForm.errors")

  return (code: ErrorCode | undefined) =>
    code && t(code, { max: DESCRIPTION_MAX })
}
