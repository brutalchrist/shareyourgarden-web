import type { Metadata } from "next"
import { MapIcon, SearchXIcon } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

// The static export has no server to render a 404 per locale, so Netlify
// serves this page for missing paths under each locale (`public/_redirects`).
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/404">): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "NotFound",
  })

  return { title: t("metaTitle"), robots: { index: false } }
}

export default async function NotFoundPage({
  params,
}: PageProps<"/[locale]/404">) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const t = await getTranslations("NotFound")

  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/map/" />} nativeButton={false}>
          <MapIcon />
          {t("backToMap")}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
