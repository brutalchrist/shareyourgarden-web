"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { isSection, type Section } from "@/components/gardens/form/draft"
import { usePathname, useRouter } from "@/i18n/navigation"

// The step or section shown on phones, kept in the URL so the browser's back
// button (or the phone's back gesture) goes back a step instead of leaving the
// form.
export function useSectionParam(name: "step" | "section") {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const raw = searchParams.get(name)
  const value = isSection(raw) ? raw : null
  // Entries this form pushed, which its own back button can pop. A section
  // opened from a link (the sidebar's shortcut, say) has none: going back
  // replaces it with the overview instead of leaving the page.
  const pushed = React.useRef(0)

  function href(section: Section | null) {
    const params = new URLSearchParams(searchParams)
    if (section) params.set(name, section)
    else params.delete(name)
    const query = params.toString()
    const path = pathname.endsWith("/") ? pathname : `${pathname}/`
    return query ? `${path}?${query}` : path
  }

  return {
    value,
    open(section: Section) {
      pushed.current += 1
      router.push(href(section), { scroll: false })
    },
    replace(section: Section | null) {
      router.replace(href(section), { scroll: false })
    },
    back(fallback: Section | null) {
      if (pushed.current > 0) {
        pushed.current -= 1
        router.back()
      } else {
        router.replace(href(fallback), { scroll: false })
      }
    },
  }
}
