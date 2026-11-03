import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { AuthProvider } from "@/components/auth-provider"
import { MyGardensProvider } from "@/components/my-gardens-provider"
import { SearchProvider } from "@/components/search-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "ShareYourGarden",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AuthProvider>
            <MyGardensProvider>
              <SearchProvider>
                <TooltipProvider>
                  <AppShell>{children}</AppShell>
                  <Toaster position="top-center" richColors />
                </TooltipProvider>
              </SearchProvider>
            </MyGardensProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
