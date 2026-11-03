"use client"

import * as React from "react"

interface SearchContextValue {
  searchText: string
  setSearchText: (value: string) => void
}

const SearchContext = React.createContext<SearchContextValue | null>(null)

function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchText, setSearchText] = React.useState("")

  return (
    <SearchContext.Provider value={{ searchText, setSearchText }}>
      {children}
    </SearchContext.Provider>
  )
}

function useSearch() {
  const context = React.useContext(SearchContext)

  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }

  return context
}

export { SearchProvider, useSearch }
