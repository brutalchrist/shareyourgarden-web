"use client"

import { LogInIcon, SproutIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useAuth } from "@/components/auth-provider"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export function GardenPageLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  // Shown at the end of the header, e.g. links to related pages.
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useTranslations("GardenPage")
  const { status } = useAuth()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col">
        <header className="flex items-start gap-3 px-4 pt-6 md:px-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SproutIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-xl font-semibold">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {actions && status === "authenticated" && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
        <div className="flex-1">
          {status === "loading" ? (
            <GardenFormSkeleton />
          ) : status === "anonymous" ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LogInIcon />
                </EmptyMedia>
                <EmptyTitle>{t("signInTitle")}</EmptyTitle>
                <EmptyDescription>{t("signInDescription")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}

export function GardenFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
