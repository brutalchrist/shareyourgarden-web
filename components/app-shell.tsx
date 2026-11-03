"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/auth-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const isAuthenticated = status === "authenticated"

  // The tree stays the same when signing in or out so the page (and its map)
  // is not remounted; only the sidebar and its trigger come and go.
  return (
    <SidebarProvider className="h-svh min-h-0">
      {isAuthenticated && <AppSidebar />}
      <SidebarInset className="min-w-0">
        <AppHeader showSidebarTrigger={isAuthenticated} />
        <div className="min-h-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
