"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useSearch } from "@/components/search-provider"
import { UserMenu } from "@/components/user-menu"

export function AppHeader() {
  const { searchText, setSearchText } = useSearch()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6">
      <div className="text-xl font-medium">ShareYourGarden</div>
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative w-full max-w-[300px]">
          <Input
            type="text"
            placeholder="tomato"
            aria-label="Buscar productos"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="pr-8"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <UserMenu />
      </div>
    </header>
  )
}
