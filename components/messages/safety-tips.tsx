"use client"

import { ShieldCheckIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const TIPS = ["publicPlace", "tellSomeone", "privateData", "block"] as const

/**
 * Plain advice for meeting someone from the app for the first time. Folded by
 * default so it stays visible without getting in the way of the message.
 */
export function SafetyTips() {
  const t = useTranslations("SafetyTips")

  return (
    <Accordion className="rounded-lg border bg-muted/50 px-3">
      <AccordionItem>
        <AccordionTrigger className="items-center py-2.5 text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 shrink-0" aria-hidden />
            {t("title")}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-3 text-muted-foreground">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {TIPS.map((tip) => (
              <li key={tip}>{t(`tips.${tip}`)}</li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
