export interface Location {
  type: "Point"
  coordinates: [number, number]
}

export interface Person {
  name: string
  // Only sent to the garden's owner.
  email?: string
  picture?: string
}

export interface ProductImage {
  id: string
  url: string
  thumbUrl: string
  // Of the full-size image.
  width: number
  height: number
}

export interface Product {
  name: string
  type: string
  quantity: number
  unit?: string
  // The first one is the cover.
  images: ProductImage[]
}

export interface Garden {
  id: string
  name: string
  description: string
  // Shown on the public map; hidden gardens are only listed to their owner.
  active: boolean
  location: Location
  products: Product[]
  owner: Person
  ownerId?: string
  updatedAt?: string
}

// Photos are sent by id: uploads from `POST /uploads/images` or photos the
// product already had.
export interface ProductInput extends Omit<Product, "images"> {
  images: { id: string }[]
}

// What the owner sends when creating or updating a garden. The owner itself is
// taken from the authenticated user by the backend.
export type GardenInput = Pick<
  Garden,
  "name" | "description" | "active" | "location"
> & { products: ProductInput[] }

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toGarden(data: any): Garden {
  return {
    id: data?.id ?? "",
    name: data?.name ?? "",
    description: data?.description ?? "",
    active: data?.active ?? true,
    location: {
      type: "Point",
      coordinates: data?.location?.coordinates ?? [0, 0],
    },
    products: (data?.products ?? []).map((product: any) => ({
      name: product?.name ?? "",
      type: product?.type ?? "",
      quantity: product?.quantity ?? 0,
      unit: product?.unit ?? undefined,
      images: (product?.images ?? []).map(toProductImage),
    })),
    owner: {
      name: data?.owner?.name ?? "",
      email: data?.owner?.email ?? undefined,
      picture: data?.owner?.picture ?? undefined,
    },
    ownerId: data?.ownerId ?? undefined,
    updatedAt: data?.updatedAt ?? undefined,
  }
}

function toProductImage(data: any): ProductImage {
  return {
    id: data?.id ?? "",
    url: data?.url ?? "",
    thumbUrl: data?.thumbUrl ?? data?.url ?? "",
    width: data?.width ?? 0,
    height: data?.height ?? 0,
  }
}

export interface User {
  id: string
  email: string
  name?: string
  picture?: string
  // When the welcome tour was finished or skipped (ISO date); null if not seen.
  onboardingCompletedAt?: string | null
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export type ConversationRole = "owner" | "requester"

export interface Participant {
  id: string
  name: string
  picture?: string
}

export interface LastMessage {
  body: string
  senderId: string
  createdAt: string
}

// A conversation as seen by the signed-in user.
export interface Conversation {
  id: string
  gardenId: string
  gardenName: string
  productName?: string
  role: ConversationRole
  otherUser: Participant
  lastMessage: LastMessage | null
  unreadCount: number
  otherLastReadAt: string | null
  // Why nobody can write anymore, if so. "blocked" does not say who blocked.
  readOnly: ConversationReadOnlyReason | null
  // Whether the signed-in user is the one who blocked, to offer unblocking.
  blockedByMe: boolean
  createdAt: string
  updatedAt: string
}

export type ConversationReadOnlyReason = "blocked" | "garden-deleted"

export function toConversation(data: any): Conversation {
  return {
    id: data?.id ?? "",
    gardenId: data?.gardenId ?? "",
    gardenName: data?.gardenName ?? "",
    productName: data?.productName ?? undefined,
    role: data?.role === "owner" ? "owner" : "requester",
    otherUser: {
      id: data?.otherUser?.id ?? "",
      name: data?.otherUser?.name ?? "",
      picture: data?.otherUser?.picture ?? undefined,
    },
    lastMessage: data?.lastMessage
      ? {
          body: data.lastMessage.body ?? "",
          senderId: data.lastMessage.senderId ?? "",
          createdAt: data.lastMessage.createdAt ?? "",
        }
      : null,
    unreadCount: data?.unreadCount ?? 0,
    otherLastReadAt: data?.otherLastReadAt ?? null,
    readOnly:
      data?.readOnly === "blocked" || data?.readOnly === "garden-deleted"
        ? data.readOnly
        : null,
    blockedByMe: data?.blockedByMe ?? false,
    createdAt: data?.createdAt ?? "",
    updatedAt: data?.updatedAt ?? "",
  }
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export function toMessage(data: any): Message {
  return {
    id: data?.id ?? "",
    conversationId: data?.conversationId ?? "",
    senderId: data?.senderId ?? "",
    body: data?.body ?? "",
    createdAt: data?.createdAt ?? "",
  }
}
