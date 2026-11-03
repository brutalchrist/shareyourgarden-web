import { getToken } from "@/lib/auth-token"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function apiRequest<T>(
  method: string,
  uri: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken()
  const response = await fetch(API_URL + uri, {
    ...init,
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(
      `${method} ${uri} failed with status ${response.status}`,
      response.status
    )
  }

  return response.json()
}

export function apiGet<T>(uri: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>("GET", uri, init)
}

export function apiPost<T>(
  uri: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  return apiRequest<T>("POST", uri, { ...init, body: JSON.stringify(body) })
}
