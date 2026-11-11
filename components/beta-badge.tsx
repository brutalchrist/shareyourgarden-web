"use client"

import { MailIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { feedbackHref } from "@/lib/feedback"

// The landing's "beta" badge, inside the app: a tap explains it and offers a
// way to send feedback from the screens people use most.
export function BetaBadge({
  align = "start",
}: {
  align?: "start" | "center" | "end"
}) {
  const t = useTranslations("Beta")

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("label")}
        render={<Badge variant="brand" render={<button type="button" />} />}
      >
        {t("badge")}
      </PopoverTrigger>
      <PopoverContent align={align}>
        <PopoverHeader>
          <PopoverTitle>{t("title")}</PopoverTitle>
          <PopoverDescription>{t("description")}</PopoverDescription>
        </PopoverHeader>
        <a
          href={feedbackHref(t("feedbackSubject"))}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <MailIcon data-icon="inline-start" />
          {t("feedback")}
        </a>
      </PopoverContent>
    </Popover>
  )
}
