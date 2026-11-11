// Where beta feedback and the landing's contact link go. Still written here
// until it moves to the build's configuration (issue #59).
export const FEEDBACK_EMAIL = "sgonzalez@debianchile.cl"

export function feedbackHref(subject: string): string {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}`
}
