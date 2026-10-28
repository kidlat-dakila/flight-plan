const API_URL = "/api"

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!response.ok) throw new Error(`The request to ${path} failed with ${response.status}.`)
  return (await response.json()) as T
}
