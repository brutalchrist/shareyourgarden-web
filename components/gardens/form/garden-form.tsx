"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  HistoryIcon,
} from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"

import {
  sectionOf,
  sectionSnapshot,
  SECTIONS,
  toDraft,
  toInput,
  validate,
  type Section,
} from "@/components/gardens/form/draft"
import {
  PRODUCTS_SECTION_ID,
  ProductsSection,
} from "@/components/gardens/form/products"
import {
  InfoSection,
  LocationSection,
} from "@/components/gardens/form/sections"
import {
  useGardenDraft,
  type GardenDraftState,
} from "@/components/gardens/form/use-garden-draft"
import { usePlaceName } from "@/components/gardens/form/use-place-name"
import { useSectionParam } from "@/components/gardens/form/use-section-param"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsMobile } from "@/hooks/use-mobile"
import { discardGardenDraft } from "@/lib/garden-drafts"
import { useProductLabels } from "@/lib/products"
import type { Garden, GardenInput } from "@/lib/types"
import { cn } from "@/lib/utils"

// MapLibre needs `window` and WebGL, so the preview only renders on the client.
const LocationPreview = dynamic(
  () => import("@/components/map/location-preview"),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> }
)

// Past this, the overview asks whether the products are still available.
const STALE_DAYS = 14

// One page on larger screens. On phones, a new garden is filled in three
// steps, and an existing one opens on an overview whose sections are edited one
// at a time, so changing a product doesn't mean going through the rest.
export function GardenForm({
  garden,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: {
  garden?: Garden
  submitLabel: string
  // Rejects when saving failed, after telling the user.
  onSubmit: (input: GardenInput) => Promise<void>
  onCancel: () => void
  extraActions?: React.ReactNode
}) {
  const t = useTranslations("GardenForm")
  const isMobile = useIsMobile()
  const form = useGardenDraft(garden)
  const nav = useSectionParam(garden ? "section" : "step")
  const [pending, setPending] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  // On phones a new garden always shows a step; an existing one, its overview
  // unless a section is open.
  const section: Section | null =
    nav.value ?? (isMobile && !garden ? "info" : null)

  // A step or section starts at the top of the page.
  React.useEffect(() => {
    if (!isMobile) return
    formRef.current
      ?.closest("[data-slot=garden-page-scroll]")
      ?.scrollTo({ top: 0 })
  }, [isMobile, section])

  // Focuses the first error to fix, once it renders: right away, or after
  // moving to the step or section that has it.
  const focusPending = React.useRef(false)
  const [focusRequest, setFocusRequest] = React.useState(0)
  function focusFirstError() {
    focusPending.current = true
    setFocusRequest((n) => n + 1)
  }
  React.useEffect(() => {
    if (!focusPending.current) return
    const frame = requestAnimationFrame(() => {
      const invalid = formRef.current?.querySelector<HTMLElement>(
        "[aria-invalid=true], [data-focus-invalid]"
      )
      if (invalid) {
        focusPending.current = false
        invalid.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [focusRequest, section])

  // Opened from the sidebar's "Update products" on a larger screen: the whole
  // form, scrolled to its products.
  const scrollToProducts = !isMobile && nav.value === "products"
  React.useEffect(() => {
    if (!scrollToProducts) return
    document
      .getElementById(PRODUCTS_SECTION_ID)
      ?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [scrollToProducts])

  // Validates every section and saves. On a phone, an error outside the step
  // or section on screen takes the user there.
  async function save() {
    if (!form.check()) {
      if (isMobile) {
        const first = Object.keys(validate(form.draft)).map(sectionOf)
        const target = SECTIONS.find((section) => first.includes(section))
        if (target && target !== section) nav.replace(target)
      }
      focusFirstError()
      return false
    }

    setPending(true)
    try {
      await onSubmit(toInput(form.draft))
      return true
    } catch {
      return false
    } finally {
      setPending(false)
    }
  }

  function cancel() {
    // Cancelling is a choice to drop the changes, unlike navigating away.
    discardGardenDraft(garden?.id)
    onCancel()
  }

  const submitButton = (className?: string, size?: "lg") => (
    <Button
      type="submit"
      size={size}
      className={className}
      // Saving an existing garden only makes sense once something changed; a
      // new one shows what's missing instead.
      disabled={pending || form.uploading || (!!garden && !form.changed)}
    >
      {(pending || form.uploading) && <Spinner data-icon="inline-start" />}
      {form.uploading ? t("photos.uploadingSubmit") : submitLabel}
    </Button>
  )

  let content: React.ReactNode
  let footer: React.ReactNode

  if (!isMobile) {
    content = (
      <>
        <InfoSection form={form} autoFocus={!garden} />
        <FieldSeparator />
        <LocationSection form={form} />
        <FieldSeparator />
        <ProductsSection form={form} />
      </>
    )
    footer = (
      <>
        {extraActions}
        <div className="ml-auto flex gap-2">
          <CancelButton onClick={cancel} disabled={pending} />
          {submitButton()}
        </div>
      </>
    )
  } else if (!garden) {
    const step = section ?? "info"
    const index = SECTIONS.indexOf(step)
    const next = SECTIONS[index + 1]

    content = (
      <>
        <StepIndicator current={step} />
        <SectionFields section={step} form={form} autoFocus />
      </>
    )
    footer = (
      <>
        {index === 0 ? (
          <CancelButton onClick={cancel} disabled={pending} wide />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-28"
            onClick={() => nav.back(SECTIONS[index - 1])}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("back")}
          </Button>
        )}
        {next ? (
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (form.check([step])) nav.open(next)
              else focusFirstError()
            }}
          >
            {t("next")}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          submitButton("flex-1", "lg")
        )}
      </>
    )
  } else if (section) {
    content = (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 max-w-full self-start"
          onClick={() => nav.back(null)}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <span className="truncate">{garden.name}</span>
        </Button>
        <SectionFields section={section} form={form} />
      </>
    )
    footer = submitButton("flex-1", "lg")
  } else {
    content = (
      <EditOverview
        garden={garden}
        form={form}
        onOpen={nav.open}
        onSubmit={onSubmit}
      />
    )
    footer = (
      <>
        {extraActions}
        {form.changed && (
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={form.discardChanges}
              disabled={pending}
            >
              {t("discard")}
            </Button>
            {submitButton()}
          </div>
        )}
      </>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={async (event) => {
        event.preventDefault()
        // A section saved on its own goes back to the overview.
        if ((await save()) && isMobile && garden && section) nav.back(null)
      }}
      noValidate
      className="flex flex-1 flex-col"
    >
      <FieldGroup className="flex-1 p-4 md:p-6">
        {form.restored && form.changed && (
          <RestoredNotice onDiscard={form.discardChanges} />
        )}
        {content}
      </FieldGroup>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
        {footer}
      </div>
    </form>
  )
}

function SectionFields({
  section,
  form,
  autoFocus,
}: {
  section: Section
  form: GardenDraftState
  autoFocus?: boolean
}) {
  switch (section) {
    case "info":
      return (
        <InfoSection
          form={form}
          autoFocus={autoFocus}
          // Editing, the overview has the switch, which saves at once.
          showVisibility={autoFocus}
        />
      )
    case "location":
      return <LocationSection form={form} />
    case "products":
      return <ProductsSection form={form} compact />
  }
}

function StepIndicator({ current }: { current: Section }) {
  const t = useTranslations("GardenForm")
  const index = SECTIONS.indexOf(current)

  return (
    <Progress value={((index + 1) / SECTIONS.length) * 100}>
      <ProgressLabel>{t(current)}</ProgressLabel>
      <ProgressValue>
        {() => t("stepOf", { current: index + 1, total: SECTIONS.length })}
      </ProgressValue>
    </Progress>
  )
}

function EditOverview({
  garden,
  form,
  onOpen,
  onSubmit,
}: {
  garden: Garden
  form: GardenDraftState
  onOpen: (section: Section) => void
  onSubmit: (input: GardenInput) => Promise<void>
}) {
  const t = useTranslations("GardenForm")
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const { formatQuantity } = useProductLabels()
  const { draft } = form
  const saved = React.useMemo(() => toDraft(garden), [garden])
  const [savingVisibility, setSavingVisibility] = React.useState(false)

  // Hiding or showing the garden is saved right away, with what was saved
  // before: other changes in progress stay unsaved.
  async function setVisible(active: boolean) {
    form.patch({ active })
    if (Object.keys(validate(saved)).length > 0) return

    setSavingVisibility(true)
    try {
      await onSubmit(toInput({ ...saved, active }))
    } catch {
      form.patch({ active: !active })
    } finally {
      setSavingVisibility(false)
    }
  }

  const changedIn = (section: Section) =>
    sectionSnapshot(draft, section) !== sectionSnapshot(saved, section)
  const invalidIn = (section: Section) =>
    Object.keys(form.errors).some((key) => sectionOf(key) === section)

  const updatedAt = garden.updatedAt ? new Date(garden.updatedAt) : null
  const stale =
    updatedAt &&
    now.getTime() - updatedAt.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
  const [lng, lat] = draft.coordinates ?? []
  const place = usePlaceName(draft.coordinates)

  return (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="garden-active">{t("visible")}</FieldLabel>
          <FieldDescription>{t("visibleDescription")}</FieldDescription>
        </FieldContent>
        <Switch
          id="garden-active"
          checked={draft.active}
          onCheckedChange={setVisible}
          disabled={savingVisibility}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <SectionItem
          section="info"
          onOpen={onOpen}
          changed={changedIn("info")}
          invalid={invalidIn("info")}
        >
          {/* The name is the page's title: the card shows what it doesn't,
              or asks for it. */}
          <ItemDescription>
            {draft.description || t("addDescription")}
          </ItemDescription>
        </SectionItem>

        <SectionItem
          section="location"
          onOpen={onOpen}
          changed={changedIn("location")}
          invalid={invalidIn("location")}
          header={
            draft.coordinates && (
              <LocationPreview coordinates={draft.coordinates} />
            )
          }
        >
          <ItemDescription>
            {!draft.coordinates ? (
              t("noLocation")
            ) : place === undefined ? (
              <Skeleton className="h-4 w-40" />
            ) : place ? (
              // "2 Sur 1240, Talca": enough to recognize, short enough to fit.
              [place.name, place.locality]
                .filter((part, i, parts) => part && parts.indexOf(part) === i)
                .join(", ")
            ) : (
              // Without an address, at least where on the globe.
              <span className="tabular-nums">
                {`${lat!.toFixed(5)}, ${lng!.toFixed(5)}`}
              </span>
            )}
          </ItemDescription>
        </SectionItem>

        <SectionItem
          section="products"
          action={t("updateProducts")}
          count={draft.products.length}
          onOpen={onOpen}
          changed={changedIn("products")}
          invalid={invalidIn("products")}
          footer={
            draft.products.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.products.map((product) => {
                  const quantity = Number(product.quantity)
                  const soldOut =
                    product.quantity.trim() !== "" && quantity === 0
                  return (
                    <Badge
                      key={product.key}
                      variant={soldOut ? "outline" : "brand"}
                    >
                      {product.name || "—"}
                      {Number.isFinite(quantity) &&
                        ` · ${formatQuantity(quantity, product.unit || undefined)}`}
                    </Badge>
                  )
                })}
              </div>
            )
          }
        >
          {draft.products.length === 0 && (
            <ItemDescription>{t("noProducts")}</ItemDescription>
          )}
        </SectionItem>

        {stale && !changedIn("products") && draft.products.length > 0 && (
          <Alert>
            <ClockIcon />
            <AlertDescription>
              {t("stale", { when: format.relativeTime(updatedAt, now) })}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </FieldGroup>
  )
}

// A section of the overview: what it holds, and a tap to edit it. A button
// covers the whole card, as in the map's garden drawer, so content with its own
// links (the map's attribution) can sit on top without nesting them in it.
function SectionItem({
  section,
  action,
  count,
  changed,
  invalid,
  onOpen,
  header,
  footer,
  children,
}: {
  section: Section
  action?: string
  count?: number
  changed: boolean
  invalid: boolean
  onOpen: (section: Section) => void
  header?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  const t = useTranslations("GardenForm")
  const title = t(section)
  const label = action ?? t("edit")

  return (
    <Item
      variant="outline"
      className="relative has-[>button:hover]:bg-muted/50"
    >
      <button
        type="button"
        onClick={() => onOpen(section)}
        aria-label={`${label}: ${title}`}
        className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {header && (
        // Above the button only for the map's own links; taps elsewhere on
        // it fall through to the button.
        <ItemHeader className="pointer-events-none relative z-20">
          {header}
        </ItemHeader>
      )}
      <ItemContent className="min-w-0">
        <ItemTitle>
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground tabular-nums">
              · {count}
            </span>
          )}
          {changed && <Badge variant="secondary">{t("unsaved")}</Badge>}
          {invalid && <Badge variant="destructive">{t("reviewSection")}</Badge>}
        </ItemTitle>
        {children}
      </ItemContent>
      <ItemActions>
        <span className="text-sm text-muted-foreground">{label}</span>
        <ChevronRightIcon />
      </ItemActions>
      {footer && <ItemFooter>{footer}</ItemFooter>}
    </Item>
  )
}

function RestoredNotice({ onDiscard }: { onDiscard: () => void }) {
  const t = useTranslations("GardenForm")

  return (
    <Alert role="status">
      <HistoryIcon />
      <AlertDescription>{t("restored")}</AlertDescription>
      <AlertAction>
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
          {t("discard")}
        </Button>
      </AlertAction>
    </Alert>
  )
}

function CancelButton({
  onClick,
  disabled,
  wide,
}: {
  onClick: () => void
  disabled: boolean
  wide?: boolean
}) {
  const t = useTranslations("GardenForm")

  return (
    <Button
      type="button"
      variant={wide ? "outline" : "ghost"}
      size={wide ? "lg" : undefined}
      className={cn(wide && "w-28")}
      onClick={onClick}
      disabled={disabled}
    >
      {t("cancel")}
    </Button>
  )
}
