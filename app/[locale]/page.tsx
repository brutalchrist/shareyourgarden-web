import type { Metadata } from "next"
import {
  BanIcon,
  EyeOffIcon,
  HandHeartIcon,
  MailCheckIcon,
  MapIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  SproutIcon,
  type LucideIcon,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ButtonLink } from "@/components/button-link"
import { FeaturedGardens } from "@/components/landing/featured-gardens"
import { LandingHeader } from "@/components/landing/landing-header"
import { LanguageMenuButton } from "@/components/language-menu"
import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { localeAlternates } from "@/i18n/metadata"
import type { Locale } from "@/i18n/routing"
import { feedbackHref } from "@/lib/feedback"
import { PRODUCT_TYPES } from "@/lib/products"

const NEW_GARDEN_HREF = "/gardens/new/"

const STEPS: readonly {
  id: "search" | "connect" | "grow"
  icon: LucideIcon
}[] = [
  { id: "search", icon: SearchIcon },
  { id: "connect", icon: MessageCircleIcon },
  { id: "grow", icon: SproutIcon },
]

const TRUST: readonly {
  id: "email" | "block" | "visibility"
  icon: LucideIcon
}[] = [
  { id: "email", icon: MailCheckIcon },
  { id: "block", icon: BanIcon },
  { id: "visibility", icon: EyeOffIcon },
]

const FAQ = [
  "cost",
  "account",
  "data",
  "coordinate",
  "safety",
  "phone",
] as const

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Landing",
  })

  return {
    description: t("metaDescription"),
    alternates: localeAlternates("/"),
  }
}

// The project's public face, for everyone, signed in or not. It lives outside
// the app shell (see `AppShell`), and the installed app opens the map instead
// (`app/manifest.ts`).
export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const t = await getTranslations("Landing")

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#content"
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-20 focus:ring-3 focus:ring-ring/50"
      >
        {t("skipToContent")}
      </a>
      <LandingHeader />

      <main id="content" className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:px-6 lg:pt-24 lg:pb-24">
          <div className="flex flex-col gap-6">
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/map/" size="lg" className="px-4">
                <MapIcon data-icon="inline-start" />
                {t("hero.explore")}
              </ButtonLink>
              <ButtonLink
                href={NEW_GARDEN_HREF}
                variant="outline"
                size="lg"
                className="px-4"
              >
                <PlusIcon data-icon="inline-start" />
                {t("hero.share")}
              </ButtonLink>
            </div>
            <p className="text-sm text-muted-foreground">{t("hero.note")}</p>
          </div>
          <ProductTypesArt />
        </section>

        {/* Why it exists */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center lg:py-20">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <HandHeartIcon className="size-5" />
            </span>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {t("why.title")}
            </h2>
            <p className="text-lg text-pretty text-muted-foreground">
              {t("why.body")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.rich("why.beta", {
                link: (chunks) => (
                  <a
                    href={feedbackHref(t("why.feedbackSubject"))}
                    className="rounded-sm font-medium text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 lg:px-6 lg:py-24"
        >
          <SectionTitle>{t("steps.title")}</SectionTitle>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ id, icon: Icon }, i) => (
              <li key={id} className="flex flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold">
                  <span className="text-muted-foreground">{i + 1}. </span>
                  {t(`steps.${id}.title`)}
                </h3>
                <p className="text-muted-foreground">{t(`steps.${id}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Two audiences */}
        <section className="mx-auto max-w-6xl px-4 pb-16 lg:px-6 lg:pb-24">
          <SectionTitle>{t("audiences.title")}</SectionTitle>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {t("audiences.owner.title")}
                </CardTitle>
                <CardDescription className="text-base">
                  {t("audiences.owner.body")}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <ButtonLink href={NEW_GARDEN_HREF} variant="outline">
                  <PlusIcon data-icon="inline-start" />
                  {t("audiences.owner.action")}
                </ButtonLink>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {t("audiences.seeker.title")}
                </CardTitle>
                <CardDescription className="text-base">
                  {t("audiences.seeker.body")}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <ButtonLink href="/map/" variant="outline">
                  <SearchIcon data-icon="inline-start" />
                  {t("audiences.seeker.action")}
                </ButtonLink>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Featured gardens */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
            <SectionTitle description={t("featured.subtitle")}>
              {t("featured.title")}
            </SectionTitle>
            <div className="mt-10">
              <FeaturedGardens />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
          <SectionTitle>{t("trust.title")}</SectionTitle>
          <ItemGroup className="mt-10 grid gap-3 md:grid-cols-3">
            {TRUST.map(({ id, icon: Icon }) => (
              <Item key={id} variant="outline">
                <ItemMedia>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <Icon className="size-4" />
                  </span>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-pretty">
                    {t(`trust.${id}`)}
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mx-auto max-w-3xl scroll-mt-16 px-4 pb-16 lg:px-6 lg:pb-24"
        >
          <SectionTitle>{t("faq.title")}</SectionTitle>
          <Accordion className="mt-8">
            {FAQ.map((id) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger className="text-base">
                  {t(`faq.${id}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  {t(`faq.${id}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-16 lg:px-6 lg:pb-24">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 rounded-2xl bg-brand/10 px-6 py-14 text-center ring-1 ring-brand/20">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("final.title")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("final.subtitle")}
            </p>
            <ButtonLink href="/map/" size="lg" className="mt-2 px-4">
              <MapIcon data-icon="inline-start" />
              {t("final.action")}
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer>
        <Separator />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row lg:px-6">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-2">
            <a
              href={feedbackHref(t("why.feedbackSubject"))}
              className="rounded-sm px-1 underline-offset-3 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t("footer.contact")}
            </a>
            <LanguageMenuButton />
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionTitle({
  children,
  description,
}: {
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {children}
      </h2>
      {description && (
        <p className="text-lg text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// The kinds of things neighbors share, as a quiet illustration beside the
// hero. Decorative: the same words are in the text.
function ProductTypesArt() {
  return (
    <div
      aria-hidden
      className="hidden w-full max-w-sm grid-cols-3 gap-3 justify-self-center rounded-3xl bg-brand/10 p-6 ring-1 ring-brand/20 sm:grid lg:max-w-none lg:p-8"
    >
      {[...PRODUCT_TYPES, "seedbed" as const, "vegetable" as const]
        .slice(0, 9)
        .map((type, i) => {
          const Icon = PRODUCT_TYPE_ICONS[type]

          return (
            <span
              key={i}
              className="flex aspect-square items-center justify-center rounded-2xl bg-background text-brand shadow-xs ring-1 ring-foreground/5"
            >
              <Icon className="size-8 lg:size-10" />
            </span>
          )
        })}
    </div>
  )
}
