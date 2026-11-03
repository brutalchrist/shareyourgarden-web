"use client"

import { useAuth } from "@/components/auth-provider"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

// Signed-in users reach their account from the sidebar footer (`NavUser`),
// so the header only offers sign-in to anonymous visitors.
export function UserMenu() {
  const { status } = useAuth()

  if (status === "loading") {
    return <div className="h-8 w-8 sm:w-[180px]" aria-hidden />
  }

  if (status === "authenticated") {
    return null
  }

  return <GoogleSignInButton />
}
