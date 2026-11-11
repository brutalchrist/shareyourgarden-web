"use client"

import { MapIcon, MessagesSquareIcon, SproutIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { BetaBadge } from "@/components/beta-badge"
import { useMessages } from "@/components/messages/messages-provider"
import { UnreadIndicator } from "@/components/messages/unread-indicator"
import { NavGardens } from "@/components/nav-gardens"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/navigation"

const navItems = [
  { title: "map", href: "/map", icon: MapIcon },
  { title: "messages", href: "/messages", icon: MessagesSquareIcon },
] as const

export function AppSidebar() {
  const t = useTranslations("Sidebar")
  const pathname = usePathname()
  const { summary } = useMessages()
  const tMessages = useTranslations("Messages")
  const unread: Partial<Record<(typeof navItems)[number]["title"], number>> = {
    messages: summary?.unread,
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/map" />}
              tooltip="ShareYourGarden"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <SproutIcon className="size-4" />
              </div>
              <span className="truncate font-heading font-semibold">
                ShareYourGarden
              </span>
            </SidebarMenuButton>
            {/* Over the button's free end, outside the link; hidden when the
                sidebar folds to icons. */}
            <div className="absolute top-1/2 right-2 -translate-y-1/2 group-data-[collapsible=icon]:hidden">
              <BetaBadge />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={
                      unread[item.title]
                        ? `${t(item.title)} · ${tMessages("unreadConversations", { count: unread[item.title]! })}`
                        : t(item.title)
                    }
                    className="relative"
                  >
                    <item.icon />
                    <span className="truncate">{t(item.title)}</span>
                    <UnreadIndicator count={unread[item.title] ?? 0} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavGardens />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
