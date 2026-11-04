// Opened from the home screen or as an installed app, not in a browser tab.
export function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  )
}

// iPadOS reports itself as a Mac; touch tells them apart.
export function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  )
}
