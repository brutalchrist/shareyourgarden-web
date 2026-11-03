"use client"

import { LanguagesIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LOCALE_NAMES, routing } from "@/i18n/routing"
import {
  useLocalePreference,
  type LocalePreference,
} from "@/i18n/use-locale-preference"

// "Automatic" plus every locale, shared by the user menu and the header.
function LanguageMenuItems() {
  const t = useTranslations("LanguageMenu")
  const { preference, detected, setPreference } = useLocalePreference()

  return (
    <DropdownMenuRadioGroup
      value={preference}
      onValueChange={(value: LocalePreference) => setPreference(value)}
    >
      <DropdownMenuRadioItem value="auto" closeOnClick>
        {t("auto", { language: LOCALE_NAMES[detected] })}
      </DropdownMenuRadioItem>
      {routing.locales.map((locale) => (
        <DropdownMenuRadioItem key={locale} value={locale} closeOnClick>
          {/* Read out in its own language by screen readers. */}
          <span lang={locale}>{LOCALE_NAMES[locale]}</span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

// Submenu for the signed-in user menu: "Idioma: Español ›".
export function LanguageSubmenu() {
  const t = useTranslations("LanguageMenu")
  const { locale } = useLocalePreference()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <LanguagesIcon />
        {t("current", { language: LOCALE_NAMES[locale] })}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-48">
        <LanguageMenuItems />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// Header button for visitors without an account, who have no user menu.
export function LanguageMenuButton() {
  const t = useTranslations("LanguageMenu")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("buttonLabel")}
            title={t("buttonLabel")}
          />
        }
      >
        <LanguagesIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
