import { createNavigation } from "next-intl/navigation"

import { routing } from "@/i18n/routing"

// Locale-aware replacements for `next/link` and `next/navigation`: paths are
// written without the locale (`/map/`) and the current one is prefixed.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
