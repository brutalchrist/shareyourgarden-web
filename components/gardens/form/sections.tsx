"use client"

import dynamic from "next/dynamic"
import { Loader2Icon, LocateFixedIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  type ErrorCode,
} from "@/components/gardens/form/draft"
import type { GardenDraftState } from "@/components/gardens/form/use-garden-draft"
import { AddressSearch } from "@/components/map/address-search"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/user-avatar"

// MapLibre needs `window` and WebGL, so the picker only renders on the client.
const LocationPicker = dynamic(
  () => import("@/components/map/location-picker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full rounded-md sm:h-80" />,
  }
)

export function useErrorMessage() {
  const t = useTranslations("GardenForm.errors")

  return (code: ErrorCode | undefined | null) =>
    code ? t(code, { max: DESCRIPTION_MAX }) : undefined
}

export function InfoSection({
  form,
  autoFocus,
  showVisibility = true,
}: {
  form: GardenDraftState
  autoFocus?: boolean
  // Editing on a phone, the switch lives in the overview, where it saves at once.
  showVisibility?: boolean
}) {
  const t = useTranslations("GardenForm")
  const errorMessage = useErrorMessage()
  const { user } = useAuth()
  const { draft, patch, errors } = form

  return (
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
            autoFocus={autoFocus}
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
        {showVisibility && (
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
        )}
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
  )
}

export function LocationSection({ form }: { form: GardenDraftState }) {
  const t = useTranslations("GardenForm")
  const errorMessage = useErrorMessage()
  const { draft, patch, errors, location } = form
  const [lng, lat] = draft.coordinates ?? []

  return (
    <FieldSet>
      <FieldLegend>{t("location")}</FieldLegend>
      <FieldDescription>{t("locationDescription")}</FieldDescription>
      <Field>
        <AddressSearch
          near={draft.coordinates}
          onSelect={(place) => {
            location.clearError()
            patch({ coordinates: place.coordinates })
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={location.locateMe}
            disabled={location.locating}
          >
            {location.locating ? (
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
          {errorMessage(errors.location ?? location.error)}
        </FieldError>
      </Field>
    </FieldSet>
  )
}
