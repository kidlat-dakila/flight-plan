const API_URL = "/api"

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`The request failed with status ${status}.`)
  }
}

export const request = async <Body>(path: string): Promise<Body> => {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json" } })
  if (!response.ok) throw new ApiError(response.status)
  return (await response.json()) as Body
}
