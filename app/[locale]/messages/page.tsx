import { Suspense } from "react"
import type { Metadata } from "next"

import { MessagesView } from "@/components/messages/messages-view"
import { localeAlternates } from "@/i18n/metadata"

export const metadata: Metadata = {
  alternates: localeAlternates("/messages/"),
}

export default function MessagesPage() {
  return (
    // The open conversation and filters come from the query string, which is
    // only known in the browser for this statically exported page.
    <Suspense>
      <MessagesView />
    </Suspense>
  )
}
