import { apiPatch } from "@/lib/api"
import type { User } from "@/lib/types"

// Marks the welcome tour as seen (the server sets the date), or clears it so
// it shows again.
export function setOnboardingCompleted(completed: boolean): Promise<User> {
  return apiPatch<User>("/users/me", { onboardingCompleted: completed })
}
