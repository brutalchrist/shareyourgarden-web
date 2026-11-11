"use client"

import * as React from "react"
import Script from "next/script"
import { useLocale, useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { useAuth } from "@/components/auth-provider"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// Narrower than Tailwind's `sm`, the header's button is Google's round icon:
// the brand, its "beta" badge and the language button need the room.
const COMPACT_QUERY = "(max-width: 639px)"

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia(COMPACT_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function GoogleSignInButton({
  fullWidth = false,
}: {
  // A large "Continue with Google" button filling its container, for sign-in
  // prompts inside the page instead of the header.
  fullWidth?: boolean
} = {}) {
  const t = useTranslations("SignIn")
  const locale = useLocale()
  const { signInWithCredential } = useAuth()
  const { resolvedTheme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = React.useState(
    () => typeof window !== "undefined" && Boolean(window.google?.accounts.id)
  )
  const [error, setError] = React.useState(false)
  const compact = React.useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false
  )

  React.useEffect(() => {
    const container = containerRef.current

    if (!scriptReady || !container || !GOOGLE_CLIENT_ID) {
      return
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => {
        setError(false)
        signInWithCredential(credential).catch(() => setError(true))
      },
      use_fedcm_for_prompt: true,
    })
    const theme = resolvedTheme === "dark" ? "filled_black" : "outline"

    if (fullWidth) {
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme,
        size: "large",
        text: "continue_with",
        shape: "pill",
        // Google caps the width at 400px.
        width: Math.min(400, Math.floor(container.clientWidth)),
        locale,
      })
      return
    }

    // A re-render replaces the previous button.
    container.replaceChildren()

    if (compact) {
      google.accounts.id.renderButton(container, {
        type: "icon",
        theme,
        size: "medium",
        shape: "circle",
        locale,
      })
      return
    }

    google.accounts.id.renderButton(container, {
      type: "standard",
      theme,
      size: "medium",
      text: "signin",
      shape: "pill",
      locale,
    })
  }, [
    scriptReady,
    resolvedTheme,
    locale,
    signInWithCredential,
    fullWidth,
    compact,
  ])

  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  if (fullWidth) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
        <div
          ref={containerRef}
          className="flex h-10 w-full justify-center [color-scheme:light]"
        />
        {error && (
          <span className="text-sm text-destructive">{t("error")}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {error && <span className="text-sm text-destructive">{t("error")}</span>}
      {/* Google's iframe is light; a dark color-scheme around it makes Chrome paint it an opaque white box. */}
      <div ref={containerRef} className="h-8 [color-scheme:light]" />
    </div>
  )
}
