"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  MapPinIcon,
  MessagesSquareIcon,
  SearchXIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { ButtonLink } from "@/components/button-link"
import { DeleteGardenDialog } from "@/components/gardens/delete-garden-dialog"
import { GardenForm } from "@/components/gardens/form/garden-form"
import {
  GardenFormSkeleton,
  GardenPageLayout,
} from "@/components/gardens/garden-page-layout"
import { useMessages } from "@/components/messages/messages-provider"
import { useMyGardens } from "@/components/my-gardens-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Link, useRouter } from "@/i18n/navigation"
import { messagesHref } from "@/lib/conversations"
import { getGarden, gardenMapHref } from "@/lib/gardens"
import type { Garden } from "@/lib/types"

export function EditGarden() {
  const t = useTranslations("EditGarden")
  const id = useSearchParams().get("id") ?? ""
  const router = useRouter()
  const { status: authStatus } = useAuth()
  const { gardens, update } = useMyGardens()
  const [fetched, setFetched] = React.useState<{
    id: string
    garden: Garden | null
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  // Opened from the sidebar the garden is already loaded; a shared or reloaded
  // link fetches it.
  const listed = gardens.find((garden) => garden.id === id)

  React.useEffect(() => {
    if (listed || !id || authStatus !== "authenticated") {
      return
    }

    let cancelled = false

    getGarden(id)
      .then((garden) => !cancelled && setFetched({ id, garden }))
      .catch(() => !cancelled && setFetched({ id, garden: null }))

    return () => {
      cancelled = true
    }
  }, [id, listed, authStatus])

  const garden = listed ?? (fetched?.id === id ? fetched.garden : undefined)
  const { summary } = useMessages()
  const unread = garden ? (summary?.byGarden[garden.id] ?? 0) : 0
  const gardenMessagesHref = messagesHref({ role: "received", garden: id })

  return (
    <GardenPageLayout
      title={garden ? garden.name : t("title")}
      description={t("description")}
      actions={
        garden && (
          // Always a way to this garden's conversations, which the sidebar
          // badge counts.
          <ButtonLink variant="outline" href={gardenMessagesHref}>
            <MessagesSquareIcon data-icon="inline-start" />
            <span className="max-sm:sr-only">{t("messages")}</span>
            {unread > 0 && (
              <Badge className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">
                <span aria-hidden>{unread > 99 ? "99+" : unread}</span>
                <span className="sr-only">
                  {t("unreadCount", { count: unread })}
                </span>
              </Badge>
            )}
          </ButtonLink>
        )
      }
    >
      {garden === undefined && id ? (
        <GardenFormSkeleton />
      ) : !garden ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>{t("notFoundTitle")}</EmptyTitle>
            <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/gardens/new/" />} nativeButton={false}>
              {t("createGarden")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {unread > 0 && (
            <div className="px-4 pt-4 md:px-6">
              <Item
                variant="outline"
                size="sm"
                role="status"
                className="border-primary/25 bg-primary/5"
              >
                <ItemMedia variant="icon">
                  <MessagesSquareIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t("unreadTitle", { count: unread })}</ItemTitle>
                  <ItemDescription>{t("unreadDescription")}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ButtonLink size="sm" href={gardenMessagesHref}>
                    {t("viewMessages")}
                  </ButtonLink>
                </ItemActions>
              </Item>
            </div>
          )}
          <GardenForm
            // Reset the form when switching gardens from the sidebar.
            key={garden.id}
            garden={garden}
            submitLabel={t("submit")}
            onCancel={() => router.back()}
            onSubmit={async (input) => {
              try {
                await update(garden.id, input)
                toast.success(t("saved"))
              } catch (error) {
                console.error(error)
                toast.error(t("error"))
                throw error
              }
            }}
            extraActions={
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={t("delete")}
                  title={t("delete")}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2Icon />
                </Button>
                <Button
                  variant="outline"
                  className="max-sm:hidden"
                  render={<Link href={gardenMapHref(garden)} />}
                  nativeButton={false}
                >
                  <MapPinIcon />
                  {t("viewOnMap")}
                </Button>
              </>
            }
          />
          <DeleteGardenDialog
            garden={confirmDelete ? garden : null}
            onOpenChange={setConfirmDelete}
            onDeleted={() => router.replace("/map/")}
          />
        </>
      )}
    </GardenPageLayout>
  )
}
