const API_URL = "/api"

export const request = async <Body>(path: string): Promise<Body> => {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`The request to ${path} failed with ${response.status}.`)
  return (await response.json()) as Body
}
