"use client"

import * as React from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  HistoryIcon,
  Loader2Icon,
  MapPinIcon,
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
import { useSectionParam } from "@/components/gardens/form/use-section-param"
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
import { Switch } from "@/components/ui/switch"
import { useIsMobile } from "@/hooks/use-mobile"
import { discardGardenDraft } from "@/lib/garden-drafts"
import { useProductLabels } from "@/lib/products"
import type { Garden, GardenInput } from "@/lib/types"
import { cn } from "@/lib/utils"

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

  const submitButton = (className?: string) => (
    <Button
      type="submit"
      className={className}
      // Saving an existing garden only makes sense once something changed; a
      // new one shows what's missing instead.
      disabled={pending || form.uploading || (!!garden && !form.changed)}
    >
      {(pending || form.uploading) && <Loader2Icon className="animate-spin" />}
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
            className="h-11 w-28 rounded-full"
            onClick={() => nav.back(SECTIONS[index - 1])}
          >
            <ArrowLeftIcon />
            {t("back")}
          </Button>
        )}
        {next ? (
          <Button
            type="button"
            className="h-11 flex-1 rounded-full"
            onClick={() => {
              if (form.check([step])) nav.open(next)
              else focusFirstError()
            }}
          >
            {t("next")}
            <ArrowRightIcon />
          </Button>
        ) : (
          submitButton("h-11 flex-1 rounded-full")
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
          className="-ml-2 self-start text-muted-foreground"
          onClick={() => nav.back(null)}
        >
          <ArrowLeftIcon />
          <span className="max-w-60 truncate">{garden.name}</span>
        </Button>
        <SectionFields section={section} form={form} />
      </>
    )
    footer = submitButton("h-11 flex-1 rounded-full")
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
    <div className="-mx-4 -mt-4 border-b px-4 pt-3 pb-3">
      <p className="text-xs text-muted-foreground">
        {t.rich("stepOf", {
          current: index + 1,
          total: SECTIONS.length,
          b: (chunks) => (
            <span className="font-semibold text-brand">{chunks}</span>
          ),
        })}
      </p>
      <ol className="mt-2 grid grid-cols-3 gap-1.5">
        {SECTIONS.map((section, i) => (
          <li
            key={section}
            aria-current={i === index ? "step" : undefined}
            className="flex flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                "h-1 rounded-full bg-border",
                i <= index && "bg-brand"
              )}
            />
            <span
              className={cn(
                "truncate text-xs text-muted-foreground",
                i === index && "font-medium text-foreground"
              )}
            >
              {t(section)}
            </span>
          </li>
        ))}
      </ol>
    </div>
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

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal" className="rounded-xl border p-3">
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

      <SectionCard
        section="info"
        onOpen={onOpen}
        changed={changedIn("info")}
        invalid={invalidIn("info")}
      >
        <span className="block truncate font-medium text-foreground">
          {draft.name || "—"}
        </span>
        <span className="line-clamp-2">
          {draft.description || t("noDescription")}
        </span>
      </SectionCard>

      <SectionCard
        section="location"
        onOpen={onOpen}
        changed={changedIn("location")}
        invalid={invalidIn("location")}
      >
        <span className="flex items-center gap-1.5 tabular-nums">
          <MapPinIcon className="size-3.5 shrink-0" />
          {draft.coordinates
            ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`
            : t("noLocation")}
        </span>
      </SectionCard>

      <SectionCard
        section="products"
        action={t("updateProducts")}
        count={draft.products.length}
        onOpen={onOpen}
        changed={changedIn("products")}
        invalid={invalidIn("products")}
      >
        {draft.products.length === 0 ? (
          t("noProducts")
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {draft.products.map((product) => {
              const quantity = Number(product.quantity)
              const soldOut = product.quantity.trim() !== "" && quantity === 0
              return (
                <span
                  key={product.key}
                  className={cn(
                    "rounded-full bg-brand/10 px-2.5 py-0.5 text-xs text-foreground",
                    soldOut && "bg-muted text-muted-foreground line-through"
                  )}
                >
                  {product.name || "—"}
                  {!soldOut &&
                    Number.isFinite(quantity) &&
                    ` · ${formatQuantity(quantity, product.unit || undefined)}`}
                </span>
              )
            })}
          </span>
        )}
        {stale && !changedIn("products") && draft.products.length > 0 && (
          <span className="mt-2 block rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
            {t("stale", { when: format.relativeTime(updatedAt, now) })}
          </span>
        )}
      </SectionCard>
    </div>
  )
}

function SectionCard({
  section,
  action,
  count,
  changed,
  invalid,
  onOpen,
  children,
}: {
  section: Section
  action?: string
  count?: number
  changed: boolean
  invalid: boolean
  onOpen: (section: Section) => void
  children: React.ReactNode
}) {
  const t = useTranslations("GardenForm")
  const title = t(section)

  return (
    <button
      type="button"
      onClick={() => onOpen(section)}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
        invalid && "border-destructive/60"
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className="font-heading text-base font-semibold">{title}</span>
        {count !== undefined && (
          <span className="text-sm text-muted-foreground tabular-nums">
            · {count}
          </span>
        )}
        {changed && (
          <Badge variant="secondary" className="rounded-full">
            {t("unsaved")}
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-0.5 text-sm font-medium text-muted-foreground">
          {action ?? t("edit")}
          <ChevronRightIcon className="size-4" />
        </span>
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
      {invalid && (
        <span className="text-xs font-medium text-destructive">
          {t("reviewSection")}
        </span>
      )}
    </button>
  )
}

function RestoredNotice({ onDiscard }: { onDiscard: () => void }) {
  const t = useTranslations("GardenForm")

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
    >
      <HistoryIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">{t("restored")}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
        {t("discard")}
      </Button>
    </div>
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
      className={cn(wide && "h-11 w-28 rounded-full")}
      onClick={onClick}
      disabled={disabled}
    >
      {t("cancel")}
    </Button>
  )
}
