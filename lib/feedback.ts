// Where beta feedback and the landing's contact link go. It comes from the
// build's environment so the address isn't written in this public repository.
// Without it, the feedback links are left out.
const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL

export function feedbackHref(subject: string): string | undefined {
  if (!FEEDBACK_EMAIL) return undefined
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}`
}
