"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { isInstalled, isIos } from "@/lib/platform"

// Chromium's install event, not in TypeScript's DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "install-prompt-dismissed"
const DISMISS_DAYS = 30
// Let the visitor see the page before asking.
const DELAY_MS = 10_000
const TOAST_ID = "install-prompt"

function isPhone() {
  return window.matchMedia("(pointer: coarse) and (max-width: 767px)").matches
}

function wasDismissed() {
  try {
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY))
    return Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {}
}

// Suggests installing the app on phones. Android and other Chromium browsers
// offer their own install dialog; iOS has none, so it explains the steps.
export function InstallPrompt() {
  const t = useTranslations("Install")

  React.useEffect(() => {
    if (isInstalled() || !isPhone() || wasDismissed()) return

    let timer: number | undefined

    function show(description: string, onInstall?: () => void) {
      timer = window.setTimeout(() => {
        toast(t("title"), {
          id: TOAST_ID,
          description,
          duration: Infinity,
          action: onInstall && { label: t("install"), onClick: onInstall },
          cancel: { label: t("dismiss"), onClick: rememberDismissed },
          onDismiss: rememberDismissed,
        })
      }, DELAY_MS)
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      const install = event as BeforeInstallPromptEvent
      show(t("description"), () => {
        install.prompt()
        install.userChoice.then(({ outcome }) => {
          if (outcome === "dismissed") rememberDismissed()
        })
      })
    }

    function onInstalled() {
      toast.dismiss(TOAST_ID)
    }

    if (isIos()) {
      show(t("iosDescription"))
    } else {
      window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    }
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [t])

  return null
}
