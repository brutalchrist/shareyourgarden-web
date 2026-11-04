import type { Metadata } from "next"
import { WifiOffIcon } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ReloadButton } from "@/components/reload-button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { Locale } from "@/i18n/routing"

// The service worker (`public/sw.js`) shows this page in place of any page it
// can't load offline, so reloading retries the page that was asked for.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/offline">): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Offline",
  })

  return { title: t("metaTitle"), robots: { index: false } }
}

export default async function OfflinePage({
  params,
}: PageProps<"/[locale]/offline">) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const t = await getTranslations("Offline")

  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ReloadButton>{t("retry")}</ReloadButton>
      </EmptyContent>
    </Empty>
  )
}
