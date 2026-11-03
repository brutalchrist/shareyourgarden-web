"use client"

import { LogOutIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  const { user, status, signOut } = useAuth()

  if (status === "loading") {
    return <div className="h-8 w-8 sm:w-[180px]" aria-hidden />
  }

  if (!user) {
    return <GoogleSignInButton />
  }

  return (
    <div className="flex items-center gap-2">
      {user.picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          className="size-8 rounded-full"
        />
      )}
      <span className="hidden text-sm sm:inline">
        {user.name ?? user.email}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={signOut}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOutIcon />
      </Button>
    </div>
  )
}
