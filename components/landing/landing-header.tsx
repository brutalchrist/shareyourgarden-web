import { SproutIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { ButtonLink } from "@/components/button-link"
import { LanguageMenuButton } from "@/components/language-menu"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

// The landing's own header: it scrolls with a long page, unlike the app's,
// and points to its sections. The primary action is the hero's, so the
// header's stays secondary.
export async function LandingHeader() {
  const t = await getTranslations("Landing")

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <SproutIcon className="size-4" />
          </span>
          <span className="font-heading font-semibold">ShareYourGarden</span>
          <Badge variant="brand">{t("beta")}</Badge>
        </Link>
        <nav
          aria-label={t("nav.label")}
          className="ml-auto hidden items-center gap-1 md:flex"
        >
          <a
            href="#how-it-works"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("nav.howItWorks")}
          </a>
          <ButtonLink href="/map/" variant="ghost" size="sm">
            {t("nav.map")}
          </ButtonLink>
          <a
            href="#faq"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("nav.faq")}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LanguageMenuButton />
          {/* On phones the hero's button is right below; no room for both. */}
          <ButtonLink
            href="/map/"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            {t("headerCta")}
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
