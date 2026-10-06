const API_URL = "/api"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function readError(response: Response): Promise<ApiError> {
  const body = await response.text()
  return new ApiError(response.status, body || response.statusText)
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!response.ok) throw await readError(response)
  return (await response.json()) as T
}
