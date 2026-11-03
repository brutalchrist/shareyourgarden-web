"use client"

import * as React from "react"
import Script from "next/script"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { useAuth } from "@/components/auth-provider"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function GoogleSignInButton() {
  const t = useTranslations("SignIn")
  const { signInWithCredential } = useAuth()
  const { resolvedTheme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = React.useState(
    () => typeof window !== "undefined" && Boolean(window.google?.accounts.id)
  )
  const [error, setError] = React.useState(false)

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
    // Icon-only button on phones so the header doesn't overflow.
    const compact = !window.matchMedia("(min-width: 640px)").matches
    google.accounts.id.renderButton(container, {
      type: compact ? "icon" : "standard",
      theme: resolvedTheme === "dark" ? "filled_black" : "outline",
      size: "medium",
      text: "signin_with",
      shape: "pill",
      locale: "es",
    })
  }, [scriptReady, resolvedTheme, signInWithCredential])

  if (!GOOGLE_CLIENT_ID) {
    return null
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
      <div
        ref={containerRef}
        className="h-8 [color-scheme:light] sm:min-w-[180px]"
      />
    </div>
  )
}
