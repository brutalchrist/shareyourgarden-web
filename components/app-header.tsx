"use client"

import { SearchIcon } from "lucide-react"

import { useSearch } from "@/components/search-provider"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"

// Based on the `SiteHeader` from shadcn's dashboard-01 block.
export function AppHeader({
  showSidebarTrigger = false,
}: {
  showSidebarTrigger?: boolean
}) {
  const { searchText, setSearchText } = useSearch()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
          </>
        )}
        <h1 className="text-base font-medium">ShareYourGarden</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <InputGroup className="w-full max-w-[300px]">
            <InputGroupInput
              type="search"
              placeholder="tomato"
              aria-label="Buscar productos"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
