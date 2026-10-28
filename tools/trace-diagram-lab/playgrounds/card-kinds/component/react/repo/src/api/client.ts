const API_URL = "/api"

export async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`The request to ${path} failed with ${response.status}.`)
  return (await response.json()) as T
}
