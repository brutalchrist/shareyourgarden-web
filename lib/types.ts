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
}

export interface Garden {
  name: string
  location: Location
  products: Product[]
  owner: Person
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toGarden(data: any): Garden {
  return {
    name: data?.name ?? "",
    location: {
      type: "Point",
      coordinates: data?.location?.coordinates ?? [0, 0],
    },
    products: (data?.products ?? []).map((product: any) => ({
      name: product?.name ?? "",
      type: product?.type ?? "",
      quantity: product?.quantity ?? 0,
    })),
    owner: {
      name: data?.owner?.name ?? "",
      email: data?.owner?.email ?? "",
    },
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
