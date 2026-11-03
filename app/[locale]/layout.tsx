import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import "../globals.css"
import { AppShell } from "@/components/app-shell"
import { AuthProvider } from "@/components/auth-provider"
import { MessagesProvider } from "@/components/messages/messages-provider"
import { MyGardensProvider } from "@/components/my-gardens-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// The static export prerenders every locale; any other segment is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "Metadata",
  })

  return {
    title: t("title"),
    // Netlify sets `URL` to the site's address at build time.
    metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  }
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <MyGardensProvider>
                <MessagesProvider>
                  <TooltipProvider>
                    <AppShell>{children}</AppShell>
                    <Toaster position="top-center" richColors />
                  </TooltipProvider>
                </MessagesProvider>
              </MyGardensProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
