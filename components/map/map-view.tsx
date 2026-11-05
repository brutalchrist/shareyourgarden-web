"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

import { MapEmptyState } from "@/components/map/map-empty-state"
import { MapSearch } from "@/components/map/map-search"
import { useProductLabels, type ProductType } from "@/lib/products"

// MapLibre needs `window` and WebGL, so the map only renders on the client.
const GardenMap = dynamic(() => import("@/components/map/garden-map"), {
  ssr: false,
})

export interface MapFilter {
  searchText: string
  productType: ProductType | null
}

export function MapView() {
  const [searchText, setSearchText] = React.useState("")
  const [productType, setProductType] = React.useState<ProductType | null>(null)
  const [isEmpty, setIsEmpty] = React.useState(false)
  const { productTypeLabel } = useProductLabels()

  const filter = React.useMemo(
    () => ({ searchText, productType }),
    [searchText, productType]
  )

  return (
    // `isolate` keeps the map's markers and controls below overlays like the drawer.
    <div className="relative isolate size-full">
      {/* The focused garden comes from the URL query, only known in the
          browser for this statically exported page. */}
      <React.Suspense>
        <FocusedGardenMap filter={filter} onEmptyChange={setIsEmpty} />
      </React.Suspense>
      {/* Outside the map, so it is in the prerendered page and shows before
          MapLibre has loaded. */}
      <MapSearch
        searchText={searchText}
        onSearchTextChange={setSearchText}
        productType={productType}
        onProductTypeChange={setProductType}
      >
        {isEmpty && (
          <MapEmptyState
            query={
              searchText.trim() ||
              (productType ? productTypeLabel(productType) : "")
            }
          />
        )}
      </MapSearch>
    </div>
  )
}

function FocusedGardenMap({
  filter,
  onEmptyChange,
}: {
  filter: MapFilter
  onEmptyChange: (isEmpty: boolean) => void
}) {
  const searchParams = useSearchParams()
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  const gardenId = searchParams.get("garden")
  const hasFocus =
    searchParams.has("lat") &&
    searchParams.has("lng") &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)

  const focus = React.useMemo(
    () => (hasFocus ? { lat, lng, gardenId } : null),
    [hasFocus, lat, lng, gardenId]
  )

  return (
    <GardenMap focus={focus} filter={filter} onEmptyChange={onEmptyChange} />
  )
}
