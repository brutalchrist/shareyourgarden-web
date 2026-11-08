"use client"

import * as React from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MapIcon,
  SproutIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "cn"

import { useMyGardens } from "@/components/my-gardens-provider"
import {
  ExchangeScene,
  MapScene,
  MessagesScene,
  ShareScene,
  WelcomeScene,
  type SceneProps,
} from "@/components/onboarding/tour-illustrations"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { feedbackHref } from "@/lib/feedback"
import type { User } from "@/lib/types"

// How the tour was left: `create-garden` also takes them to the garden form.
export type TourOutcome = "completed" | "skipped" | "create-garden"

const STEPS: readonly {
  id: "welcome" | "map" | "exchange" | "messages" | "share"
  Scene: React.ComponentType<SceneProps>
}[] = [
  { id: "welcome", Scene: WelcomeScene },
  { id: "map", Scene: MapScene },
  { id: "exchange", Scene: ExchangeScene },
  { id: "messages", Scene: MessagesScene },
  { id: "share", Scene: ShareScene },
]

type StepId = (typeof STEPS)[number]["id"]

// Horizontal swipes this long change the step on touch screens.
const SWIPE_PX = 50

export function WelcomeTour({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: User
  onClose: (outcome: TourOutcome) => void
}) {
  const isMobile = useIsMobile()
  const [step, setStep] = React.useState(0)
  const [direction, setDirection] = React.useState<1 | -1>(1)
  const primaryRef = React.useRef<HTMLButtonElement>(null)

  // Start over every time it opens (adjusted while rendering, not in an
  // effect, so the first frame already shows step one).
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(0)
      setDirection(1)
    }
  }

  const goTo = React.useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, next))
      if (clamped === step) return
      setDirection(clamped > step ? 1 : -1)
      setStep(clamped)
    },
    [step]
  )

  function onOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose("skipped")
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") goTo(step + 1)
    else if (event.key === "ArrowLeft") goTo(step - 1)
  }

  const body = (
    <TourBody
      step={step}
      direction={direction}
      user={user}
      isMobile={isMobile}
      primaryRef={primaryRef}
      goTo={goTo}
      onClose={onClose}
      Title={isMobile ? DrawerTitle : DialogTitle}
      Description={isMobile ? DrawerDescription : DialogDescription}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent initialFocus={primaryRef} onKeyDown={onKeyDown}>
          {body}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={primaryRef}
        onKeyDown={onKeyDown}
        className="gap-0 overflow-hidden p-0 sm:max-w-[27.5rem]"
      >
        {body}
      </DialogContent>
    </Dialog>
  )
}

function TourBody({
  step,
  direction,
  user,
  isMobile,
  primaryRef,
  goTo,
  onClose,
  Title,
  Description,
}: {
  step: number
  direction: 1 | -1
  user: User
  isMobile: boolean
  primaryRef: React.RefObject<HTMLButtonElement | null>
  goTo: (step: number) => void
  onClose: (outcome: TourOutcome) => void
  Title: typeof DialogTitle | typeof DrawerTitle
  Description: typeof DialogDescription | typeof DrawerDescription
}) {
  const t = useTranslations("WelcomeTour")
  const { gardens } = useMyGardens()
  const touchStart = React.useRef<number | null>(null)

  const { id, Scene } = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const firstName = user.name?.trim().split(/\s+/)[0]
  const hasGarden = gardens.length > 0

  const title =
    id === "welcome"
      ? firstName
        ? t("steps.welcome.title", { name: firstName })
        : t("steps.welcome.titleNoName")
      : t(`steps.${id as Exclude<StepId, "welcome">}.title`)

  const enter =
    direction === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"

  return (
    <div
      className="flex flex-col"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        const end = event.changedTouches[0]?.clientX
        touchStart.current = null
        if (start == null || end == null) return
        if (end - start <= -SWIPE_PX) goTo(step + 1)
        else if (end - start >= SWIPE_PX) goTo(step - 1)
      }}
    >
      <div className="relative">
        {/* Keyed so each step's scene plays its entrance again. */}
        <div
          key={id}
          aria-hidden="true"
          className={cn(
            "h-44 overflow-hidden bg-linear-to-b from-brand/15 to-brand/0 sm:h-52",
            isMobile && "rounded-t-xl"
          )}
        >
          <Scene firstName={firstName} />
        </div>
        {/* On phones "Skip" sits in the footer, next to "Back". */}
        {!isLast && !isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3"
            onClick={() => onClose("skipped")}
          >
            {t("skip")}
          </Button>
        )}
      </div>

      <div
        key={`text-${id}`}
        className={cn(
          // Tall enough for the longest step, so the panel never changes size.
          "flex animate-in flex-col gap-2 px-6 pt-5 duration-200 fade-in-0 motion-reduce:animate-none",
          enter,
          isMobile ? "min-h-44 text-center" : "min-h-36"
        )}
      >
        <Title className="text-xl font-semibold text-balance">{title}</Title>
        <Description className="text-base text-pretty">
          {t(`steps.${id}.body`)}
        </Description>
        {isLast && (
          <p className="text-sm text-muted-foreground">
            {t.rich("beta", {
              link: (chunks) => (
                <a
                  className="font-medium text-foreground underline underline-offset-3"
                  href={feedbackHref(t("feedbackSubject"))}
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {t("progress", { current: step + 1, total: STEPS.length })}
      </p>

      <div
        className={cn(
          "flex gap-3 p-6 pt-5",
          isMobile ? "flex-col-reverse" : "items-center justify-between"
        )}
      >
        <StepDots step={step} goTo={goTo} centered={isMobile} />

        <div className={cn("flex gap-2", isMobile && "flex-col-reverse")}>
          {isLast ? (
            <>
              {hasGarden ? null : (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onClose("completed")}
                >
                  <MapIcon data-icon="inline-start" />
                  {t("explore")}
                </Button>
              )}
              <Button
                ref={primaryRef}
                size="lg"
                onClick={() =>
                  onClose(hasGarden ? "completed" : "create-garden")
                }
              >
                {hasGarden ? (
                  <MapIcon data-icon="inline-start" />
                ) : (
                  <SproutIcon data-icon="inline-start" />
                )}
                {hasGarden ? t("explore") : t("createGarden")}
              </Button>
            </>
          ) : isMobile ? (
            <>
              <div className="flex justify-between">
                {/* Kept in place on the first step so "Skip" doesn't move. */}
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(isFirst && "invisible")}
                  onClick={() => goTo(step - 1)}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  {t("back")}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => onClose("skipped")}
                >
                  {t("skip")}
                </Button>
              </div>
              <Button ref={primaryRef} size="lg" onClick={() => goTo(step + 1)}>
                {isFirst ? t("start") : t("next")}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </>
          ) : (
            <>
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => goTo(step - 1)}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  {t("back")}
                </Button>
              )}
              <Button ref={primaryRef} size="lg" onClick={() => goTo(step + 1)}>
                {isFirst ? t("start") : t("next")}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StepDots({
  step,
  goTo,
  centered,
}: {
  step: number
  goTo: (step: number) => void
  centered: boolean
}) {
  const t = useTranslations("WelcomeTour")

  return (
    <div className={cn("flex items-center", centered && "justify-center")}>
      {STEPS.map(({ id }, index) => (
        <button
          key={id}
          type="button"
          aria-label={t("goToStep", { number: index + 1 })}
          aria-current={index === step ? "step" : undefined}
          onClick={() => goTo(index)}
          className="group/dot flex h-6 items-center px-1 outline-none"
        >
          <span
            className={cn(
              "block h-1.5 rounded-full transition-all duration-300 group-focus-visible/dot:ring-3 group-focus-visible/dot:ring-ring/50 motion-reduce:transition-none",
              index === step
                ? "w-5 bg-primary"
                : "w-1.5 bg-muted-foreground/30 group-hover/dot:bg-muted-foreground/60"
            )}
          />
        </button>
      ))}
    </div>
  )
}
