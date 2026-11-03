import { apiDelete, apiGet, apiPost } from "@/lib/api"
import {
  toConversation,
  toMessage,
  type Conversation,
  type Message,
} from "@/lib/types"

export const CONVERSATION_FILTERS = ["all", "received", "sent"] as const
export type ConversationFilter = (typeof CONVERSATION_FILTERS)[number]

export const MESSAGE_MAX_LENGTH = 2000

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
  const { conversations } = await listConversations(
    { role: "sent", gardenId, limit: 1 },
    signal
  )

  return conversations[0] ?? null
}

export interface ConversationsPage {
  conversations: Conversation[]
  hasMore: boolean
}

export async function listConversations(
  query: {
    role?: ConversationFilter
    gardenId?: string
    // `lastMessage.createdAt` of the last conversation already loaded.
    before?: string
    limit?: number
  },
  signal?: AbortSignal
): Promise<ConversationsPage> {
  const params = new URLSearchParams()
  if (query.role && query.role !== "all") params.set("role", query.role)
  if (query.gardenId) params.set("gardenId", query.gardenId)
  if (query.before) params.set("before", query.before)
  if (query.limit) params.set("limit", String(query.limit))

  const data = await apiGet<{ conversations: unknown[]; hasMore: boolean }>(
    `/conversations?${params}`,
    { signal }
  )

  return {
    conversations: data.conversations.map(toConversation),
    hasMore: data.hasMore,
  }
}

export interface ConversationsSummary {
  // Conversations with unread messages, in either role.
  unread: number
  // Conversations with unread messages per garden the user owns.
  byGarden: Record<string, number>
}

export async function getConversationsSummary(
  signal?: AbortSignal
): Promise<ConversationsSummary> {
  const data = await apiGet<Partial<ConversationsSummary>>(
    "/conversations/summary",
    { signal }
  )

  return { unread: data.unread ?? 0, byGarden: data.byGarden ?? {} }
}

export async function getConversation(
  id: string,
  signal?: AbortSignal
): Promise<Conversation> {
  return toConversation(
    await apiGet<unknown>(`/conversations/${encodeURIComponent(id)}`, {
      signal,
    })
  )
}

export interface MessagesPage {
  // Oldest first.
  messages: Message[]
  hasMore: boolean
}

// Without cursor, the latest page. `before` loads older history and `after`
// polls for new messages (both are message ids).
export async function listMessages(
  conversationId: string,
  query: { before?: string; after?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<MessagesPage> {
  const params = new URLSearchParams()
  if (query.before) params.set("before", query.before)
  if (query.after) params.set("after", query.after)
  if (query.limit) params.set("limit", String(query.limit))

  const data = await apiGet<{ messages: unknown[]; hasMore: boolean }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${params}`,
    { signal }
  )

  return { messages: data.messages.map(toMessage), hasMore: data.hasMore }
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<Message> {
  return toMessage(
    await apiPost<unknown>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { body }
    )
  )
}

export function markConversationRead(conversationId: string): Promise<void> {
  return apiPost(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    undefined
  )
}

// Blocks or unblocks the other person in the conversation. Blocking is between
// people, so it applies to all their conversations.
export function blockConversation(conversationId: string): Promise<void> {
  return apiPost(
    `/conversations/${encodeURIComponent(conversationId)}/block`,
    undefined
  )
}

export function unblockConversation(conversationId: string): Promise<void> {
  return apiDelete(`/conversations/${encodeURIComponent(conversationId)}/block`)
}

// Query params instead of dynamic segments: the static export has no server to
// render a page per conversation.
export function messagesHref(
  params: {
    conversation?: string | null
    role?: ConversationFilter
    garden?: string | null
  } = {}
): string {
  const search = new URLSearchParams()
  if (params.role && params.role !== "all") search.set("role", params.role)
  if (params.garden) search.set("garden", params.garden)
  if (params.conversation) search.set("c", params.conversation)
  const query = search.toString()

  return query ? `/messages/?${query}` : "/messages/"
}
