import { apiGet, apiPost } from "@/lib/api"
import { toConversation, type Conversation } from "@/lib/types"

export interface StartConversationInput {
  gardenId: string
  body: string
  productName?: string
}

// Writes to a garden's owner. The backend reuses the conversation if the user
// already wrote about this garden.
export async function startConversation(
  input: StartConversationInput
): Promise<Conversation> {
  return toConversation(await apiPost<unknown>("/conversations", input))
}

// The signed-in user's conversation about someone else's garden, if any.
export async function findConversationAboutGarden(
  gardenId: string,
  signal?: AbortSignal
): Promise<Conversation | null> {
  const params = new URLSearchParams({ role: "sent", gardenId, limit: "1" })
  const { conversations } = await apiGet<{ conversations: unknown[] }>(
    `/conversations?${params}`,
    { signal }
  )

  return conversations.length > 0 ? toConversation(conversations[0]) : null
}
