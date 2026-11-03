"use client"

import {
  EllipsisVerticalIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { useAuth } from "@/components/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserAvatar } from "@/components/user-avatar"

// Based on the `NavUser` from shadcn's dashboard-01 block.
export function NavUser() {
  const t = useTranslations("UserMenu")
  const { user, signOut } = useAuth()
  const { isMobile } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!user) {
    return null
  }

  const details = (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name ?? user.email}</span>
      {user.name && (
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      )}
    </div>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent" />
            }
          >
            <UserAvatar user={user} className="rounded-lg" />
            {details}
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserAvatar user={user} />
                  {details}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Toggles to the opposite appearance and keeps the menu open. */}
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
              {isDark ? t("lightAppearance") : t("darkAppearance")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOutIcon />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
