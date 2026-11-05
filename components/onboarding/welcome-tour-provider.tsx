"use client"

import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import {
  WelcomeTour,
  type TourOutcome,
} from "@/components/onboarding/welcome-tour"
import { usePathname, useRouter } from "@/i18n/navigation"
import { setOnboardingCompleted } from "@/lib/users"

// Lets the map show for a moment before the tour covers it.
const AUTO_OPEN_DELAY_MS = 1200
// `?tour=1` opens the tour on any page, for testing and demos.
const FORCE_PARAM = "tour"
const NEW_GARDEN_HREF = "/gardens/new/"

// Remembers on this device that the tour was seen, in case saving it on the
// server failed (offline, server asleep); it is synced on the next visit.
function seenKey(userId: string) {
  return `syg.onboarding-seen.${userId}`
}

function seenLocally(userId: string) {
  try {
    return localStorage.getItem(seenKey(userId)) !== null
  } catch {
    return false
  }
}

function rememberSeen(userId: string) {
  try {
    localStorage.setItem(seenKey(userId), new Date().toISOString())
  } catch {}
}

function forgetSeen(userId: string) {
  try {
    localStorage.removeItem(seenKey(userId))
  } catch {}
}

interface WelcomeTourContextValue {
  open: boolean
  openTour: () => void
}

const WelcomeTourContext = React.createContext<WelcomeTourContextValue | null>(
  null
)

// Shows the welcome tour once to people who just created their account, and
// lets them see it again from the user menu.
function WelcomeTourProvider({ children }: { children: React.ReactNode }) {
  const { user, status, updateUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  // Opened automatically at most once per page load.
  const autoOpened = React.useRef(false)

  const userId = user?.id
  const pending =
    status === "authenticated" && user?.onboardingCompletedAt == null

  // Seen on this device but not saved on the server yet: retry quietly.
  React.useEffect(() => {
    if (!userId || !pending || !seenLocally(userId)) return

    setOnboardingCompleted(true)
      .then((saved) => {
        updateUser({ onboardingCompletedAt: saved.onboardingCompletedAt })
        forgetSeen(userId)
      })
      .catch(() => {})
  }, [userId, pending, updateUser])

  React.useEffect(() => {
    if (status !== "authenticated" || !userId || autoOpened.current) return

    const params = new URLSearchParams(window.location.search)
    const forced = params.get(FORCE_PARAM) === "1"

    if (forced) {
      params.delete(FORCE_PARAM)
      const query = params.toString()
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname +
          (query ? `?${query}` : "") +
          window.location.hash
      )
    } else {
      // Only on the map, and not when a link brought them to a garden: they
      // came for something specific, so the tour waits for the next visit.
      const onMap = pathname.startsWith("/map")
      const focused = params.has("lat") && params.has("lng")
      if (!pending || seenLocally(userId) || !onMap || focused) return
    }

    autoOpened.current = true
    const timer = window.setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      autoOpened.current = false
    }
  }, [status, userId, pending, pathname])

  const close = React.useCallback(
    (outcome: TourOutcome) => {
      setOpen(false)

      if (outcome === "create-garden") {
        router.push(NEW_GARDEN_HREF)
      }

      // Any way out counts as seen: it never opens by itself again.
      if (!userId || !pending) return

      rememberSeen(userId)
      updateUser({ onboardingCompletedAt: new Date().toISOString() })
      setOnboardingCompleted(true)
        .then((saved) => {
          updateUser({ onboardingCompletedAt: saved.onboardingCompletedAt })
          forgetSeen(userId)
        })
        .catch((error) => console.error(error))
    },
    [router, userId, pending, updateUser]
  )

  const openTour = React.useCallback(() => setOpen(true), [])

  const value = React.useMemo(() => ({ open, openTour }), [open, openTour])

  return (
    <WelcomeTourContext.Provider value={value}>
      {children}
      {user && <WelcomeTour open={open} user={user} onClose={close} />}
    </WelcomeTourContext.Provider>
  )
}

function useWelcomeTour() {
  const context = React.useContext(WelcomeTourContext)

  if (!context) {
    throw new Error("useWelcomeTour must be used within a WelcomeTourProvider")
  }

  return context
}

export { WelcomeTourProvider, useWelcomeTour }
