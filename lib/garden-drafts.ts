// Unsaved garden form changes, kept per tab so leaving the form (to check the
// map, say) and coming back doesn't lose them.
const KEY_PREFIX = "syg.gardenDraft."

interface StoredDraft<T> {
  // The saved garden the draft was based on: a draft of an older version is
  // stale and gets dropped.
  base: string
  draft: T
}

function storageKey(gardenId?: string) {
  return KEY_PREFIX + (gardenId ?? "new")
}

export function loadGardenDraft<T>(
  gardenId: string | undefined,
  base: string
): T | null {
  try {
    const stored = sessionStorage.getItem(storageKey(gardenId))
    if (!stored) return null

    const parsed = JSON.parse(stored) as StoredDraft<T>
    return parsed.base === base ? parsed.draft : null
  } catch {
    return null
  }
}

export function saveGardenDraft<T>(
  gardenId: string | undefined,
  base: string,
  draft: T
) {
  try {
    sessionStorage.setItem(
      storageKey(gardenId),
      JSON.stringify({ base, draft } satisfies StoredDraft<T>)
    )
  } catch {
    // Storage unavailable (private mode, blocked site data): changes last
    // until the form unmounts.
  }
}

export function discardGardenDraft(gardenId?: string) {
  try {
    sessionStorage.removeItem(storageKey(gardenId))
  } catch {
    // Nothing to discard.
  }
}
