"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  EyeOffIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCwIcon,
  SproutIcon,
  Trash2Icon,
} from "lucide-react"

import { DeleteGardenDialog } from "@/components/gardens/delete-garden-dialog"
import { useMyGardens } from "@/components/my-gardens-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar"
import { gardenEditHref, gardenMapHref } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

const NEW_GARDEN_HREF = "/gardens/new/"

export function NavGardens() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Mis huertos</SidebarGroupLabel>
      <SidebarGroupAction
        render={<Link href={NEW_GARDEN_HREF} />}
        title="Nuevo huerto"
      >
        <PlusIcon />
        <span className="sr-only">Nuevo huerto</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        {/* The active garden comes from the URL query, which suspends while
            prerendering the static export. */}
        <React.Suspense fallback={<GardensSkeleton />}>
          <GardensMenu />
        </React.Suspense>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function GardensMenu() {
  const { gardens, status, reload } = useMyGardens()
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [gardenToDelete, setGardenToDelete] = React.useState<Garden | null>(
    null
  )

  const activeId = pathname.startsWith("/gardens/edit")
    ? searchParams.get("id")
    : null

  if (status === "idle" || (status === "loading" && gardens.length === 0)) {
    return <GardensSkeleton />
  }

  return (
    <>
      <SidebarMenu>
        {status === "error" && (
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={reload}
              className="text-muted-foreground"
              tooltip="Reintentar"
            >
              <RotateCwIcon />
              <span>No se pudieron cargar. Reintentar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {gardens.map((garden) => (
          <SidebarMenuItem key={garden.id}>
            <SidebarMenuButton
              render={<Link href={gardenEditHref(garden.id)} />}
              isActive={garden.id === activeId}
              tooltip={garden.name}
            >
              <SproutIcon />
              <span>{garden.name}</span>
              {!garden.active && (
                <EyeOffIcon
                  className="ml-auto size-3.5! text-muted-foreground"
                  aria-label="Oculto en el mapa"
                />
              )}
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    className="aria-expanded:bg-sidebar-accent"
                  />
                }
              >
                <MoreHorizontalIcon />
                <span className="sr-only">Acciones de {garden.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-48"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem
                  onClick={() => router.push(gardenMapHref(garden))}
                >
                  <MapPinIcon />
                  Ver en el mapa
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(gardenEditHref(garden.id))}
                >
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setGardenToDelete(garden)}
                >
                  <Trash2Icon />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}

        {status === "ready" && gardens.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={NEW_GARDEN_HREF} />}
              className="text-muted-foreground"
              tooltip="Agrega tu primer huerto"
            >
              <PlusIcon />
              <span>Agrega tu primer huerto</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>

      <DeleteGardenDialog
        garden={gardenToDelete}
        onOpenChange={(open) => !open && setGardenToDelete(null)}
        onDeleted={() => {
          if (gardenToDelete?.id === activeId) {
            router.push("/map/")
          }
        }}
      />
    </>
  )
}

function GardensSkeleton() {
  return (
    <SidebarMenu>
      {Array.from({ length: 2 }).map((_, index) => (
        <SidebarMenuItem key={index}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
