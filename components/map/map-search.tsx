"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PRODUCT_TYPES,
  useProductLabels,
  type ProductType,
} from "@/lib/products"

// Floating over the map, like the search of other map apps: what is searched
// is what the map shows, so it lives on the map rather than in the header.
// `children` (the empty state) stacks below it.
export function MapSearch({
  searchText,
  onSearchTextChange,
  productType,
  onProductTypeChange,
  children,
}: {
  searchText: string
  onSearchTextChange: (value: string) => void
  productType: ProductType | null
  onProductTypeChange: (value: ProductType | null) => void
  children?: React.ReactNode
}) {
  const t = useTranslations("MapSearch")
  const { productTypeLabel } = useProductLabels()
  const inputRef = React.useRef<HTMLInputElement>(null)

  // "/" jumps to the search from anywhere outside a text field.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement

      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return
      }

      event.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-1000 flex flex-col gap-2 md:right-auto md:w-md">
      <div className="pointer-events-auto flex flex-col gap-2">
        <InputGroup className="h-10 rounded-full bg-background shadow-md dark:bg-background">
          <InputGroupInput
            ref={inputRef}
            type="search"
            placeholder={t("placeholder")}
            aria-label={t("label")}
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onSearchTextChange("")
                event.currentTarget.blur()
              }
            }}
            // The clear button below replaces the browser's own.
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          <InputGroupAddon className="pl-3.5">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end" className="pr-2">
            {searchText ? (
              <InputGroupButton
                size="icon-xs"
                className="rounded-full"
                aria-label={t("clear")}
                title={t("clear")}
                onClick={() => {
                  onSearchTextChange("")
                  inputRef.current?.focus()
                }}
              >
                <XIcon />
              </InputGroupButton>
            ) : (
              <Kbd className="hidden md:inline-flex" title={t("shortcut")}>
                /
              </Kbd>
            )}
          </InputGroupAddon>
        </InputGroup>
        {/* Scrolls sideways on phones instead of wrapping over the map. */}
        <ToggleGroup
          aria-label={t("typesLabel")}
          value={productType ? [productType] : []}
          onValueChange={(value: string[]) =>
            onProductTypeChange((value[0] as ProductType | undefined) ?? null)
          }
          variant="outline"
          size="sm"
          className="-mx-3 w-auto max-w-none [scrollbar-width:none] overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {PRODUCT_TYPES.map((type) => {
            const Icon = PRODUCT_TYPE_ICONS[type]

            return (
              <ToggleGroupItem
                key={type}
                value={type}
                className="rounded-full bg-background shadow-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground dark:bg-background dark:aria-pressed:bg-primary"
              >
                <Icon data-icon="inline-start" />
                {productTypeLabel(type)}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
      {children}
    </div>
  )
}
