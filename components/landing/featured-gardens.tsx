"use client"

import * as React from "react"
import { MapIcon, RotateCcwIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ButtonLink } from "@/components/button-link"
import { ProductThumbnail } from "@/components/gardens/product-thumbnail"
import {
  fetchApproximateCenter,
  readSavedView,
} from "@/components/map/initial-view"
import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
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
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { gardenMapHref, getGardensNear } from "@/lib/gardens"
import { isProductType, useProductLabels } from "@/lib/products"
import type { Garden } from "@/lib/types"

const RADIUS_KM = 15
const MAX_GARDENS = 6

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; gardens: Garden[] }

// Real gardens around the visitor: where they last left the map on this
// device, or else their city from the IP address. The backend can be slow to
// wake up, so this loads on its own and never holds back the rest of the page.
// Cards leave the location out; the map shows it.
export function FeaturedGardens() {
  const t = useTranslations("Landing.featured")
  const [state, setState] = React.useState<State>({ status: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const center =
        readSavedView()?.center ??
        (await fetchApproximateCenter(controller.signal))
      if (!center) {
        setState({ status: "done", gardens: [] })
        return
      }

      const gardens = await getGardensNear(center, RADIUS_KM, controller.signal)
      setState({ status: "done", gardens: pickFeatured(gardens) })
    }

    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: "error" })
    })

    return () => controller.abort()
  }, [attempt])

  if (state.status === "loading") {
    return (
      <div role="status" aria-label={t("loading")}>
        <ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </ItemGroup>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>{t("errorTitle")}</EmptyTitle>
          <EmptyDescription>{t("errorBody")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setState({ status: "loading" })
              setAttempt((n) => n + 1)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            {t("retry")}
          </Button>
          <ButtonLink href="/map/" variant="ghost">
            {t("openMap")}
          </ButtonLink>
        </EmptyContent>
      </Empty>
    )
  }

  if (state.gardens.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapIcon />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyBody")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink href="/map/" variant="outline">
            {t("openMap")}
          </ButtonLink>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {state.gardens.map((garden) => (
        <GardenCard key={garden.id} garden={garden} />
      ))}
    </ItemGroup>
  )
}

function GardenCard({ garden }: { garden: Garden }) {
  const t = useTranslations("Landing.featured")
  const { productTypeLabel } = useProductLabels()
  const available = garden.products.filter((product) => product.quantity > 0)
  const cover =
    available.find((product) => product.images.length > 0) ?? available[0]
  const types = [...new Set(available.map((product) => product.type))]

  return (
    <Item variant="outline" render={<Link href={gardenMapHref(garden)} />}>
      <ItemMedia>
        <ProductThumbnail
          product={{ type: cover.type, images: cover.images }}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="font-heading">{garden.name}</ItemTitle>
        <ItemDescription>
          {t("products", { count: available.length })}
        </ItemDescription>
      </ItemContent>
      <ItemFooter className="flex-wrap justify-start gap-1.5">
        {types.slice(0, 3).map((type) => {
          const Icon = isProductType(type) ? PRODUCT_TYPE_ICONS[type] : null

          return (
            <Badge key={type} variant="brand">
              {Icon && <Icon data-icon="inline-start" />}
              {productTypeLabel(type)}
            </Badge>
          )
        })}
      </ItemFooter>
    </Item>
  )
}

// Gardens with something to share, the most stocked first.
function pickFeatured(gardens: Garden[]): Garden[] {
  const count = (garden: Garden) =>
    garden.products.filter((product) => product.quantity > 0).length

  return gardens
    .filter((garden) => garden.active && count(garden) > 0)
    .sort((a, b) => count(b) - count(a))
    .slice(0, MAX_GARDENS)
}
