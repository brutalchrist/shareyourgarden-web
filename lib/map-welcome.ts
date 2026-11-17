// Whether this browser has seen the map's welcome card, or the landing it
// points to: either one already says what the project is.
const DISMISSED_KEY = "syg.mapWelcomeDismissed"

const listeners = new Set<() => void>()

export function subscribeMapWelcome(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isMapWelcomeDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) !== null
  } catch {
    // Without storage the card can't remember being closed: don't show it.
    return true
  }
}

export function dismissMapWelcome() {
  try {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
  } catch {
    // Storage unavailable: it stays closed until the page reloads.
  }
  listeners.forEach((listener) => listener())
}
