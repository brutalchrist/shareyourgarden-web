"use client"

import { BellIcon, BellOffIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { usePushToggle } from "@/hooks/use-push"
import type { PushState } from "@/lib/push"

type Push = ReturnType<typeof usePushToggle>

// States the user can't change from here, only learn how to.
export type PushHelpState = Extract<PushState, "denied" | "ios-install">

// The user menu's notifications item: turns them on or off like the
// appearance item, keeping the menu open. When the browser stands in the way,
// it explains how to get them instead (`PushHelpDialog`, which lives outside
// the menu so it survives it closing).
export function PushMenuItem({
  push: { state, busy, toggle },
  onHelp,
}: {
  push: Push
  onHelp: (state: PushHelpState) => void
}) {
  const t = useTranslations("PushNotifications")

  if (state === "denied" || state === "ios-install") {
    return (
      <DropdownMenuItem onClick={() => onHelp(state)}>
        <BellOffIcon />
        {t("menu")}
      </DropdownMenuItem>
    )
  }

  if (state !== "on" && state !== "off") return null

  const on = state === "on"
  return (
    <DropdownMenuItem
      closeOnClick={false}
      disabled={busy}
      onClick={() => toggle(!on)}
    >
      {on ? <BellOffIcon /> : <BellIcon />}
      {on ? t("disable") : t("label")}
    </DropdownMenuItem>
  )
}

export function PushHelpDialog({
  state,
  onClose,
}: {
  state: PushHelpState | null
  onClose: () => void
}) {
  const t = useTranslations("PushNotifications")

  return (
    <AlertDialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("menu")}</AlertDialogTitle>
          <AlertDialogDescription>
            {state && t(`state.${state}`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
