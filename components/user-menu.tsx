"use client"

import { useAuth } from "@/components/auth-provider"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { LanguageMenuButton } from "@/components/language-menu"

// Signed-in users reach their account and language from the sidebar footer
// (`NavUser`), so the header only offers them to anonymous visitors.
export function UserMenu() {
  const { status } = useAuth()

  if (status === "loading") {
    // Room for the language button and Google's (icon-only on phones).
    return <div className="h-8 w-18 sm:w-[220px]" aria-hidden />
  }

  if (status === "authenticated") {
    return null
  }

  return (
    <>
      <LanguageMenuButton />
      <GoogleSignInButton />
    </>
  )
}
