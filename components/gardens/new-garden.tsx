"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { GardenForm } from "@/components/gardens/form/garden-form"
import { GardenPageLayout } from "@/components/gardens/garden-page-layout"
import { useMyGardens } from "@/components/my-gardens-provider"
import { useRouter } from "@/i18n/navigation"
import { discardGardenDraft } from "@/lib/garden-drafts"
import { gardenEditHref, gardenMapHref } from "@/lib/gardens"

export function NewGarden() {
  const t = useTranslations("NewGarden")
  const router = useRouter()
  const { create } = useMyGardens()

  return (
    <GardenPageLayout title={t("title")} description={t("description")}>
      <GardenForm
        submitLabel={t("submit")}
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          try {
            const garden = await create(input)
            discardGardenDraft()
            toast.success(t("created", { name: garden.name }), {
              action: {
                label: t("viewOnMap"),
                onClick: () => router.push(gardenMapHref(garden)),
              },
            })
            router.replace(gardenEditHref(garden.id))
          } catch (error) {
            console.error(error)
            toast.error(t("error"))
            throw error
          }
        }}
      />
    </GardenPageLayout>
  )
}
