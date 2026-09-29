import { vi } from "vitest"

export type FetchStub = {
  urls: string[]
  headers: Record<string, string>[]
}

export function stubGlobalFetch(routes: Record<string, unknown>): FetchStub {
  const urls: string[] = []
  const headers: Record<string, string>[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined
    const url = request?.url ?? String(input)
    urls.push(url)
    headers.push(Object.fromEntries(new Headers(init?.headers ?? request?.headers).entries()))
    const key = Object.keys(routes).find((route) => url.includes(route))
    if (key === undefined) return new Response("not found", { status: 404 })
    const body = routes[key]
    return typeof body === "string"
      ? new Response(body, { status: 200 })
      : new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
  })
  return { urls, headers }
}
