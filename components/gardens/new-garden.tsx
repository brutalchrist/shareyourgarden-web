"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { GardenForm } from "@/components/gardens/garden-form"
import { GardenPageLayout } from "@/components/gardens/garden-page-layout"
import { useMyGardens } from "@/components/my-gardens-provider"
import { discardGardenDraft } from "@/lib/garden-drafts"
import { gardenEditHref, gardenMapHref } from "@/lib/gardens"

export function NewGarden() {
  const router = useRouter()
  const { create } = useMyGardens()

  return (
    <GardenPageLayout
      title="Nuevo huerto"
      description="Comparte lo que cultivas con tus vecinos."
    >
      <GardenForm
        submitLabel="Crear huerto"
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          try {
            const garden = await create(input)
            discardGardenDraft()
            toast.success(`Creaste «${garden.name}»`, {
              action: {
                label: "Ver en el mapa",
                onClick: () => router.push(gardenMapHref(garden)),
              },
            })
            router.replace(gardenEditHref(garden.id))
          } catch (error) {
            console.error(error)
            toast.error("No pudimos crear el huerto. Inténtalo de nuevo.")
          }
        }}
      />
    </GardenPageLayout>
  )
}
