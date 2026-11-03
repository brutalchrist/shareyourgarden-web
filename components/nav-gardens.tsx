"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  EyeOffIcon,
  MapPinIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCwIcon,
  SproutIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { DeleteGardenDialog } from "@/components/gardens/delete-garden-dialog"
import { useMessages } from "@/components/messages/messages-provider"
import { UnreadIndicator } from "@/components/messages/unread-indicator"
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
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { messagesHref } from "@/lib/conversations"
import { gardenEditHref, gardenMapHref } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

const NEW_GARDEN_HREF = "/gardens/new/"

export function NavGardens() {
  const t = useTranslations("MyGardens")

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("title")}</SidebarGroupLabel>
      <SidebarGroupAction
        render={<Link href={NEW_GARDEN_HREF} />}
        title={t("newGarden")}
      >
        <PlusIcon />
        <span className="sr-only">{t("newGarden")}</span>
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
  const t = useTranslations("MyGardens")
  const { gardens, status, reload } = useMyGardens()
  const { summary } = useMessages()
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
              tooltip={t("retry")}
            >
              <RotateCwIcon />
              <span>{t("loadError")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {gardens.map((garden) => (
          <SidebarMenuItem key={garden.id}>
            <SidebarMenuButton
              render={<Link href={gardenEditHref(garden.id)} />}
              isActive={garden.id === activeId}
              tooltip={garden.name}
              className="relative"
            >
              <SproutIcon />
              <span className="truncate">{garden.name}</span>
              {!garden.active && (
                <EyeOffIcon
                  className="ml-auto size-3.5! text-muted-foreground"
                  aria-label={t("hidden")}
                />
              )}
              <UnreadIndicator
                count={summary?.byGarden[garden.id] ?? 0}
                className={!garden.active ? "ml-1" : undefined}
              />
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
                <span className="sr-only">
                  {t("actions", { name: garden.name })}
                </span>
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
                  {t("viewOnMap")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      messagesHref({ role: "received", garden: garden.id })
                    )
                  }
                >
                  <MessagesSquareIcon />
                  {t("viewMessages")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(gardenEditHref(garden.id))}
                >
                  <PencilIcon />
                  {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setGardenToDelete(garden)}
                >
                  <Trash2Icon />
                  {t("delete")}
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
              tooltip={t("addFirst")}
            >
              <PlusIcon />
              <span>{t("addFirst")}</span>
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
