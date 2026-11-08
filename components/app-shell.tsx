"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/auth-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { usePathname } from "@/i18n/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const pathname = usePathname()
  const isAuthenticated = status === "authenticated"

  // The landing is a long scrolling page with its own header and footer.
  if (pathname === "/") {
    return children
  }

  // The tree stays the same when signing in or out so the page (and its map)
  // is not remounted; only the sidebar and its trigger come and go.
  return (
    <SidebarProvider className="h-svh min-h-0">
      {isAuthenticated && <AppSidebar />}
      {/* `overflow-hidden` clips the map to the inset card's rounded corners. */}
      <SidebarInset className="min-w-0 overflow-hidden">
        <AppHeader showSidebarTrigger={isAuthenticated} />
        <div className="min-h-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
