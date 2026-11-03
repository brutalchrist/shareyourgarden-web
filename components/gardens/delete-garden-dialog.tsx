"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { useMyGardens } from "@/components/my-gardens-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Garden } from "@/lib/types"

export function DeleteGardenDialog({
  garden,
  onOpenChange,
  onDeleted,
}: {
  garden: Garden | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const { remove } = useMyGardens()
  const [pending, setPending] = React.useState(false)

  // Keep the name while the dialog animates closed.
  const [displayed, setDisplayed] = React.useState(garden)
  if (garden && garden !== displayed) {
    setDisplayed(garden)
  }

  async function handleDelete() {
    if (!garden) return

    setPending(true)
    try {
      await remove(garden.id)
      toast.success(`Eliminaste «${garden.name}»`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      console.error(error)
      toast.error("No pudimos eliminar el huerto. Inténtalo de nuevo.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={garden !== null}
      onOpenChange={(open) => !pending && onOpenChange(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar «{displayed?.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            El huerto y sus productos dejarán de aparecer en el mapa. Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
