import type { Metadata, Viewport } from "next"

import { routing } from "@/i18n/routing"

export const metadata: Metadata = {
  title: "ShareYourGarden",
}

// Blank while redirecting, so follow the system theme instead of flashing white.
export const viewport: Viewport = {
  colorScheme: "light dark",
}

// Root layout for paths without a locale, which only redirect into one.
export default function LocaleRedirectLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={routing.defaultLocale}>
      <body>{children}</body>
    </html>
  )
}
