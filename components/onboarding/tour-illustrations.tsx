"use client"

import * as React from "react"
import {
  BellIcon,
  CarrotIcon,
  LeafIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  SproutIcon,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "cn"

import { PRODUCT_TYPE_ICONS } from "@/components/product-type-icon"

// The tour's scenes, drawn with the same pins, chips and cards the app uses so
// what people learn here looks like what they will see. Decorative only: the
// step's text carries the meaning (the container is `aria-hidden`).

export interface SceneProps {
  firstName?: string
}

// Plays an entrance after `delay` ms; nothing moves with reduced motion.
function Enter({
  delay = 0,
  className,
  style,
  children,
}: {
  delay?: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "animate-in duration-500 ease-out fade-in-0 motion-reduce:animate-none",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// A garden pin like the map's (`marker-icon.ts`), at any position.
function Pin({
  icon: Icon = SproutIcon,
  own = false,
  className,
}: {
  icon?: LucideIcon
  own?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative h-11 w-9 drop-shadow-[0_2px_3px_rgb(0_0_0/0.3)]",
        className
      )}
    >
      <svg viewBox="0 0 36 44" className="block size-full">
        <path
          d="M18 1.5C8.9 1.5 1.5 8.7 1.5 17.6c0 11 13.7 22.8 15.6 24.4a1.4 1.4 0 0 0 1.8 0c1.9-1.6 15.6-13.4 15.6-24.4C34.5 8.7 27.1 1.5 18 1.5z"
          strokeWidth={2.5}
          className={
            own
              ? "fill-brand-foreground stroke-brand"
              : "fill-brand stroke-brand-foreground"
          }
        />
      </svg>
      <Icon
        className={cn(
          "absolute top-2 left-1/2 size-[18px] -translate-x-1/2",
          own ? "text-brand" : "text-brand-foreground"
        )}
      />
    </div>
  )
}

// Pins dropping onto the map, one after another.
function DroppingPin({
  delay,
  x,
  y,
  ...pin
}: React.ComponentProps<typeof Pin> & { delay: number; x: string; y: string }) {
  return (
    <Enter
      delay={delay}
      className="absolute slide-in-from-top-6"
      style={{ left: x, top: y }}
    >
      <Pin {...pin} />
    </Enter>
  )
}

// Faint streets, so the pins sit on something that reads as a map.
function MapBackdrop() {
  return (
    <svg
      className="absolute inset-0 size-full text-foreground/[0.07]"
      preserveAspectRatio="none"
      viewBox="0 0 440 208"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path
          d="M-10 150 C 90 120, 160 175, 260 135 S 400 90, 460 110"
          strokeWidth={10}
        />
        <path d="M120 -10 L 170 220" strokeWidth={7} />
        <path d="M320 -10 C 300 60, 340 120, 300 220" strokeWidth={7} />
        <path d="M-10 60 L 460 40" strokeWidth={4} />
        <path d="M40 -10 L 70 220" strokeWidth={4} />
        <path d="M230 -10 L 220 220" strokeWidth={4} />
        <path d="M-10 190 L 460 175" strokeWidth={4} />
      </g>
    </svg>
  )
}

export function WelcomeScene() {
  return (
    <div className="relative size-full">
      <MapBackdrop />
      <DroppingPin delay={250} x="16%" y="26%" icon={CarrotIcon} />
      <DroppingPin
        delay={400}
        x="72%"
        y="18%"
        icon={PRODUCT_TYPE_ICONS.fruit}
      />
      <DroppingPin delay={550} x="26%" y="56%" icon={LeafIcon} />
      <DroppingPin delay={700} x="78%" y="54%" icon={PRODUCT_TYPE_ICONS.seed} />
      <Enter
        className="absolute inset-0 flex items-center justify-center zoom-in-90"
        delay={50}
      >
        <div className="flex size-18 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-6 ring-background/70">
          <SproutIcon className="size-9" />
        </div>
      </Enter>
    </div>
  )
}

export function MapScene() {
  const t = useTranslations("WelcomeTour.scenes")
  const tProducts = useTranslations("Products.types")

  const chips = [
    { type: "vegetable", active: true },
    { type: "fruit", active: false },
    { type: "herb", active: false },
  ] as const

  return (
    <div className="relative flex size-full flex-col items-center gap-2 pt-6">
      <MapBackdrop />
      <Enter className="relative w-64 slide-in-from-top-2" delay={50}>
        <div className="flex h-9 items-center gap-2 rounded-full border bg-background px-3 text-sm shadow-sm">
          <SearchIcon className="size-4 text-muted-foreground" />
          <span>{t("search")}</span>
          <span className="-ml-1.5 h-4 w-px animate-pulse bg-foreground motion-reduce:animate-none" />
        </div>
      </Enter>
      <Enter className="relative flex gap-1.5 slide-in-from-top-2" delay={200}>
        {chips.map(({ type, active }) => {
          const Icon = PRODUCT_TYPE_ICONS[type]
          return (
            <span
              key={type}
              className={cn(
                "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium shadow-xs",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background"
              )}
            >
              <Icon className="size-3.5" />
              {tProducts(type)}
            </span>
          )
        })}
      </Enter>
      <DroppingPin delay={450} x="30%" y="64%" icon={CarrotIcon} />
      <DroppingPin delay={600} x="58%" y="58%" icon={CarrotIcon} />
    </div>
  )
}

export function ExchangeScene() {
  const t = useTranslations("WelcomeTour.scenes")
  const tProducts = useTranslations("Products.types")

  const products = [
    { name: t("product1"), type: "vegetable", amount: t("amount1") },
    { name: t("product2"), type: "herb", amount: t("amount2") },
  ] as const

  return (
    <div className="flex size-full items-end justify-center px-8">
      <Enter className="w-full max-w-64 slide-in-from-bottom-6" delay={50}>
        <div className="flex flex-col gap-2 rounded-t-xl border border-b-0 bg-background p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
              <SproutIcon className="size-4" />
            </span>
            <span className="text-sm font-semibold">{t("garden")}</span>
          </div>
          {products.map(({ name, type, amount }, index) => {
            const Icon = PRODUCT_TYPE_ICONS[type]
            return (
              <Enter
                key={name}
                delay={250 + index * 150}
                // The scene is shorter on phones: one product is enough.
                className={cn(
                  "slide-in-from-right-2",
                  index > 0 && "max-sm:hidden"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                    index === 0 && "border-primary ring-2 ring-primary/15"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-xs font-medium">{name}</span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {tProducts(type)}
                    </span>
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium">
                    {amount}
                  </span>
                </div>
              </Enter>
            )
          })}
          <Enter delay={600} className="zoom-in-95">
            <div className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground">
              <MessageCircleIcon className="size-3.5" />
              {t("propose")}
            </div>
          </Enter>
        </div>
      </Enter>
    </div>
  )
}

export function MessagesScene({ firstName }: SceneProps) {
  const t = useTranslations("WelcomeTour.scenes")

  return (
    <div className="relative flex size-full flex-col justify-center gap-2 px-10">
      <Enter
        delay={100}
        className="max-w-[75%] self-start slide-in-from-left-3"
      >
        <div className="rounded-2xl rounded-bl-sm bg-background px-3 py-2 text-xs shadow-sm ring-1 ring-foreground/10">
          {firstName ? t("incoming", { name: firstName }) : t("incomingNoName")}
        </div>
      </Enter>
      <Enter delay={500} className="max-w-[75%] self-end slide-in-from-right-3">
        <div className="rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground shadow-sm">
          {t("outgoing")}
        </div>
      </Enter>
      <Enter delay={850} className="absolute top-4 left-6 zoom-in-50">
        <span className="relative flex size-9 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10">
          <BellIcon className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[0.6rem] font-semibold text-brand-foreground">
            1
          </span>
        </span>
      </Enter>
    </div>
  )
}

export function ShareScene({ firstName }: SceneProps) {
  const t = useTranslations("WelcomeTour.scenes")

  return (
    <div className="relative size-full">
      <MapBackdrop />
      <DroppingPin delay={150} x="12%" y="22%" icon={CarrotIcon} />
      <DroppingPin delay={250} x="80%" y="30%" icon={LeafIcon} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Enter
          delay={450}
          className="flex flex-col items-center slide-in-from-top-10"
        >
          <span className="mb-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold shadow-md ring-1 ring-foreground/10">
            {firstName
              ? t("myGarden", { name: firstName })
              : t("myGardenNoName")}
          </span>
          <Pin own icon={SproutIcon} className="scale-125" />
        </Enter>
      </div>
      <Enter delay={800} className="absolute right-6 bottom-4 zoom-in-50">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <PlusIcon className="size-4" />
        </span>
      </Enter>
    </div>
  )
}
