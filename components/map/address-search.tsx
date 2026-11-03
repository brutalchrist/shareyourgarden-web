"use client"

import * as React from "react"
import { MapPinIcon, SearchIcon } from "lucide-react"

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

type SearchStatus = "idle" | "loading" | "ready" | "error"

export function AddressSearch({
  near,
  onSelect,
}: {
  // [lng, lat] to rank nearby results first.
  near?: [number, number] | null
  onSelect: (place: Place) => void
}) {
  const [places, setPlaces] = React.useState<Place[]>([])
  const [status, setStatus] = React.useState<SearchStatus>("idle")
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

      searchPlaces(query.trim(), { near, signal: controller.signal })
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

  return (
    <Combobox<Place>
      items={places}
      // Photon already ranks the results: don't filter them again by label.
      filter={null}
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
          placeholder="Busca una dirección o lugar"
          aria-label="Buscar dirección"
          showTrigger={false}
          showClear
        >
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </ComboboxInput>
      </div>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>{emptyMessage(status)}</ComboboxEmpty>
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
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
        <p className="border-t px-3 py-1.5 text-[0.7rem] text-muted-foreground">
          Búsqueda de Photon · datos ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            OpenStreetMap
          </a>
        </p>
      </ComboboxContent>
    </Combobox>
  )
}

function emptyMessage(status: SearchStatus) {
  switch (status) {
    case "idle":
      return `Escribe al menos ${MIN_QUERY_LENGTH} letras.`
    case "loading":
      return "Buscando…"
    case "error":
      return "No pudimos buscar. Inténtalo de nuevo o marca el mapa."
    case "ready":
      return "Sin resultados. Prueba con otra dirección o marca el mapa."
  }
}
