"use client"

import * as React from "react"

import { ApiError } from "@/lib/api"
import { getCurrentUser, signInWithGoogle } from "@/lib/auth"
import { clearToken, getToken, setToken } from "@/lib/auth-token"
import { disablePush } from "@/lib/push"
import type { User } from "@/lib/types"

type AuthStatus = "loading" | "authenticated" | "anonymous"

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  signInWithCredential: (credential: string) => Promise<void>
  signOut: () => void
  // Merges fields into the signed-in user, e.g. after `PATCH /users/me`.
  updateUser: (changes: Partial<User>) => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [status, setStatus] = React.useState<AuthStatus>("loading")

  React.useEffect(() => {
    let cancelled = false

    const currentUser = getToken() ? getCurrentUser() : Promise.resolve(null)

    currentUser
      .then((currentUser) => {
        if (cancelled) return
        setUser(currentUser)
        setStatus(currentUser ? "authenticated" : "anonymous")
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          clearToken()
        }
        setStatus("anonymous")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signInWithCredential = React.useCallback(async (credential: string) => {
    const { accessToken, user } = await signInWithGoogle(credential)
    setToken(accessToken)
    setUser(user)
    setStatus("authenticated")
  }, [])

  const signOut = React.useCallback(() => {
    // Pushes to this browser would otherwise still go to the previous user.
    disablePush().catch((error) => console.error(error))
    clearToken()
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
    setStatus("anonymous")
  }, [])

  const updateUser = React.useCallback((changes: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...changes } : current))
  }, [])

  const value = React.useMemo(
    () => ({ user, status, signInWithCredential, signOut, updateUser }),
    [user, status, signInWithCredential, signOut, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

export { AuthProvider, useAuth }
