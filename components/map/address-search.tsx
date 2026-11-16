"use client"

import * as React from "react"
import {
  LocateFixedIcon,
  MapPinIcon,
  MousePointerClickIcon,
  SearchIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { InputGroupAddon } from "@/components/ui/input-group"
import { searchPlaces, type Place } from "@/lib/geocoding"

const MIN_QUERY_LENGTH = 3
// Wait for a pause in typing so each keystroke doesn't hit the geocoder.
const DEBOUNCE_MS = 300
// An IP address only places the visitor in a city, often a nearby one: bias
// the results towards the region rather than the streets around that point.
const APPROXIMATE_NEAR_ZOOM = 10

type SearchStatus = "idle" | "loading" | "ready" | "error"

const EMPTY_MESSAGES = {
  loading: "loading",
  error: "error",
  ready: "noResults",
} as const

export function AddressSearch({
  near,
  approximateNear,
  onSelect,
  onPickOnMap,
  onLocateMe,
}: {
  // [lng, lat] to rank nearby results first.
  near?: [number, number] | null
  // A rougher [lng, lat] (the visitor's city) to fall back on without `near`.
  approximateNear?: [number, number] | null
  onSelect: (place: Place) => void
  // Ways out when the address isn't found, offered next to the message.
  onPickOnMap?: () => void
  onLocateMe?: () => void
}) {
  const t = useTranslations("AddressSearch")
  const locale = useLocale()
  const [places, setPlaces] = React.useState<Place[]>([])
  const [status, setStatus] = React.useState<SearchStatus>("idle")
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef<number | undefined>(undefined)
  const abortRef = React.useRef<AbortController | null>(null)
  // Align the results with the whole field, search icon included.
  const anchorRef = useComboboxAnchor()

  React.useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current)
      abortRef.current?.abort()
    },
    []
  )

  function search(query: string) {
    window.clearTimeout(timeoutRef.current)
    abortRef.current?.abort()

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setPlaces([])
      setStatus("idle")
      return
    }

    setStatus("loading")
    timeoutRef.current = window.setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      searchPlaces(query.trim(), {
        ...(near
          ? { near }
          : { near: approximateNear, nearZoom: APPROXIMATE_NEAR_ZOOM }),
        locale,
        signal: controller.signal,
      })
        .then((places) => {
          setPlaces(places)
          setStatus("ready")
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          console.error(error)
          setPlaces([])
          setStatus("error")
        })
    }, DEBOUNCE_MS)
  }

  // Close the results before handing over to the map or the geolocation.
  function fallback(action: () => void) {
    return () => {
      setOpen(false)
      action()
    }
  }

  const showFallbacks =
    (status === "ready" || status === "error") && (onPickOnMap || onLocateMe)

  return (
    <Combobox<Place>
      items={places}
      // Photon already ranks the results: don't filter them again by label.
      filter={null}
      open={open}
      onOpenChange={setOpen}
      itemToStringLabel={(place) => place.name}
      isItemEqualToValue={(place, value) => place.id === value.id}
      onInputValueChange={(value, { reason }) => {
        // Picking a result writes its name into the input: don't search it.
        if (reason === "input-change") search(value)
      }}
      onValueChange={(place) => place && onSelect(place)}
    >
      <div ref={anchorRef}>
        <ComboboxInput
          placeholder={t("placeholder")}
          aria-label={t("label")}
          showTrigger={false}
          showClear
        >
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </ComboboxInput>
      </div>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty className="flex-col items-center gap-2 px-3">
          <span>
            {status === "idle"
              ? t("minLength", { min: MIN_QUERY_LENGTH })
              : t(EMPTY_MESSAGES[status])}
          </span>
          {showFallbacks && (
            <span className="flex flex-wrap justify-center gap-2">
              {onPickOnMap && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fallback(onPickOnMap)}
                >
                  <MousePointerClickIcon data-icon="inline-start" />
                  {t("pickOnMap")}
                </Button>
              )}
              {onLocateMe && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fallback(onLocateMe)}
                >
                  <LocateFixedIcon data-icon="inline-start" />
                  {t("useMyLocation")}
                </Button>
              )}
            </span>
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(place: Place) => (
            <ComboboxItem key={place.id} value={place} className="items-start">
              <MapPinIcon className="mt-0.5 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{place.name}</span>
                {place.detail && (
                  <span className="truncate text-xs text-muted-foreground">
                    {place.detail}
                  </span>
                )}
                {place.missingNumber && (
                  <span className="text-xs text-muted-foreground italic">
                    {t("missingNumber", { number: place.missingNumber })}
                  </span>
                )}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
        <p className="border-t px-3 py-1.5 text-[0.7rem] text-muted-foreground">
          {t.rich("attribution", {
            osm: (chunks) => (
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </ComboboxContent>
    </Combobox>
  )
}
