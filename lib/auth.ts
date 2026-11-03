import { apiGet, apiPost } from "@/lib/api"
import type { AuthResponse, User } from "@/lib/types"

export function signInWithGoogle(credential: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/google", { credential })
}

export function getCurrentUser(): Promise<User> {
  return apiGet<User>("/auth/me")
}
