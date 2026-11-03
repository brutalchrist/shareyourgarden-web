"use client"

import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import {
  createGarden,
  deleteGarden,
  getMyGardens,
  updateGarden,
} from "@/lib/gardens"
import type { Garden, GardenInput } from "@/lib/types"

type MyGardensStatus = "idle" | "loading" | "ready" | "error"

interface MyGardensContextValue {
  gardens: Garden[]
  status: MyGardensStatus
  reload: () => void
  create: (input: GardenInput) => Promise<Garden>
  update: (id: string, input: Partial<GardenInput>) => Promise<Garden>
  remove: (id: string) => Promise<void>
}

const MyGardensContext = React.createContext<MyGardensContextValue | null>(null)

// The signed-in user's gardens, shared by the sidebar and the garden pages so a
// create, edit or delete shows up everywhere without refetching.
function MyGardensProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useAuth()
  const [gardens, setGardens] = React.useState<Garden[]>([])
  const [reloadKey, setReloadKey] = React.useState(0)
  // The reload the current gardens (or error) belong to.
  const [loaded, setLoaded] = React.useState<{
    key: number
    error: boolean
  } | null>(null)

  React.useEffect(() => {
    if (authStatus !== "authenticated") {
      return
    }

    let cancelled = false

    getMyGardens()
      .then((gardens) => {
        if (cancelled) return
        setGardens(gardens)
        setLoaded({ key: reloadKey, error: false })
      })
      .catch((error) => {
        if (cancelled) return
        console.error(error)
        setLoaded({ key: reloadKey, error: true })
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, reloadKey])

  // Forget the previous user's gardens on sign-out.
  if (authStatus !== "authenticated" && loaded) {
    setGardens([])
    setLoaded(null)
  }

  const status: MyGardensStatus =
    authStatus !== "authenticated"
      ? "idle"
      : loaded?.key !== reloadKey
        ? "loading"
        : loaded.error
          ? "error"
          : "ready"

  const reload = React.useCallback(() => setReloadKey((key) => key + 1), [])

  const create = React.useCallback(async (input: GardenInput) => {
    const garden = await createGarden(input)
    setGardens((gardens) => [garden, ...gardens])
    return garden
  }, [])

  const update = React.useCallback(
    async (id: string, input: Partial<GardenInput>) => {
      const garden = await updateGarden(id, input)
      setGardens((gardens) => [
        garden,
        ...gardens.filter((current) => current.id !== id),
      ])
      return garden
    },
    []
  )

  const remove = React.useCallback(async (id: string) => {
    await deleteGarden(id)
    setGardens((gardens) => gardens.filter((garden) => garden.id !== id))
  }, [])

  const value = React.useMemo(
    () => ({ gardens, status, reload, create, update, remove }),
    [gardens, status, reload, create, update, remove]
  )

  return (
    <MyGardensContext.Provider value={value}>
      {children}
    </MyGardensContext.Provider>
  )
}

function useMyGardens() {
  const context = React.useContext(MyGardensContext)

  if (!context) {
    throw new Error("useMyGardens must be used within a MyGardensProvider")
  }

  return context
}

export { MyGardensProvider, useMyGardens }
