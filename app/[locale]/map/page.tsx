import type { Metadata } from "next"

import { MapView } from "@/components/map/map-view"
import { localeAlternates } from "@/i18n/metadata"

export const metadata: Metadata = {
  alternates: localeAlternates("/map/"),
}

export default function MapPage() {
  return <MapView />
}
