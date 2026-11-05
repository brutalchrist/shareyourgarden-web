import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import "../globals.css"
import { AppShell } from "@/components/app-shell"
import { AuthProvider } from "@/components/auth-provider"
import { InstallPrompt } from "@/components/install-prompt"
import { MessagesProvider } from "@/components/messages/messages-provider"
import { MyGardensProvider } from "@/components/my-gardens-provider"
import { WelcomeTourProvider } from "@/components/onboarding/welcome-tour-provider"
import { ServiceWorker } from "@/components/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

// Titles and the wordmark: a friendlier grotesque that still reads well at
// the small sizes of drawers and dialogs. Inter stays for everything else.
const fontHeading = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
})

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
    description: t("description"),
    // Netlify sets `URL` to the site's address at build time.
    metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
    // Opened from the iOS home screen, it runs without Safari's toolbars.
    appleWebApp: { capable: true, title: t("title") },
    icons: { apple: "/icons/apple-touch-icon.png" },
  }
}

// Tints the browser and installed app's bars to match the page background.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
        inter.variable,
        fontHeading.variable
      )}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <MyGardensProvider>
                <MessagesProvider>
                  <TooltipProvider>
                    <WelcomeTourProvider>
                      <AppShell>{children}</AppShell>
                      <Toaster position="top-center" richColors />
                      <InstallPrompt />
                      <ServiceWorker />
                    </WelcomeTourProvider>
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
