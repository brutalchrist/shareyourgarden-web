export interface Location {
  type: "Point"
  coordinates: [number, number]
}

export interface Person {
  name: string
  email: string
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
      email: data?.owner?.email ?? "",
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
