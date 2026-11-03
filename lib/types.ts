export interface Location {
  type: "Point"
  coordinates: [number, number]
}

export interface Person {
  name: string
  // Only sent to the garden's owner.
  email?: string
}

export interface Product {
  name: string
  type: string
  quantity: number
  unit?: string
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

// What the owner sends when creating or updating a garden. The owner itself is
// taken from the authenticated user by the backend.
export type GardenInput = Pick<
  Garden,
  "name" | "description" | "active" | "location" | "products"
>

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
    })),
    owner: {
      name: data?.owner?.name ?? "",
      email: data?.owner?.email ?? undefined,
    },
    ownerId: data?.ownerId ?? undefined,
    updatedAt: data?.updatedAt ?? undefined,
  }
}

export interface User {
  id: string
  email: string
  name?: string
  picture?: string
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
  createdAt: string
  updatedAt: string
}

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
