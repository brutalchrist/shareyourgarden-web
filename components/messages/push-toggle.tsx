"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { usePageVisible } from "@/hooks/use-page-visible"
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "@/lib/push"

/**
 * Turns push notifications for new messages on or off on this device. The
 * browser only asks for permission when the user flips the switch, never on
 * load. Hidden when the backend has push turned off.
 */
export function PushToggle() {
  const t = useTranslations("PushNotifications")
  const locale = useLocale()
  const visible = usePageVisible()
  const [state, setState] = React.useState<PushState | null>(null)
  const [busy, setBusy] = React.useState(false)

  // Checked again on coming back, e.g. after allowing them in the settings.
  React.useEffect(() => {
    if (!visible) return

    let cancelled = false
    getPushState()
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setState("unavailable")
      })

    return () => {
      cancelled = true
    }
  }, [visible])

  if (!state || state === "unavailable") return null

  const toggle = async (on: boolean) => {
    setBusy(true)
    try {
      if (on) {
        setState(await enablePush(locale))
      } else {
        await disablePush()
        setState("off")
      }
    } catch (error) {
      console.error(error)
      toast.error(t(on ? "enableError" : "disableError"))
      setState(await getPushState().catch(() => state))
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || (state !== "on" && state !== "off")

  return (
    <div className="border-t p-4">
      <Field orientation="horizontal" data-disabled={disabled}>
        <FieldContent>
          <FieldLabel htmlFor="push-notifications">{t("label")}</FieldLabel>
          <FieldDescription>{t(`state.${state}`)}</FieldDescription>
        </FieldContent>
        <Switch
          id="push-notifications"
          checked={state === "on"}
          disabled={disabled}
          onCheckedChange={toggle}
        />
      </Field>
    </div>
  )
}
