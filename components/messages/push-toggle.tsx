"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { usePushToggle } from "@/hooks/use-push"

/**
 * Offers push notifications for new messages where they make sense, under the
 * conversations. Only while they could still be turned on: once on, or
 * blocked, they're managed from the user menu (`PushMenuItem`), so this
 * doesn't keep asking.
 */
export function PushToggle() {
  const t = useTranslations("PushNotifications")
  const { state, busy, toggle } = usePushToggle()

  if (state !== "off" && state !== "ios-install") return null

  const enable = async () => {
    if ((await toggle(true)) === "on") {
      toast.success(t("enabled"), { description: t("enabledHint") })
    }
  }

  const disabled = busy || state !== "off"

  return (
    <div className="border-t p-4">
      <Field orientation="horizontal" data-disabled={disabled}>
        <FieldContent>
          <FieldLabel htmlFor="push-notifications">{t("label")}</FieldLabel>
          <FieldDescription>{t(`state.${state}`)}</FieldDescription>
        </FieldContent>
        <Switch
          id="push-notifications"
          checked={false}
          disabled={disabled}
          onCheckedChange={(on) => on && enable()}
        />
      </Field>
    </div>
  )
}
