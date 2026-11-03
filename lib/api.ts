const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337"

export async function apiGet<T>(uri: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + uri, {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GET ${uri} failed with status ${response.status}`)
  }

  return response.json()
}
