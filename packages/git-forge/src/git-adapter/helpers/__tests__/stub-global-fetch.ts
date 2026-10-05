import { vi } from "vitest"

export interface FetchStub {
  readonly urls: () => string[]
  readonly headers: () => Record<string, string>[]
  readonly bodies: () => string[]
}

type FetchInput = string | URL | Request

const urlOf = (input: FetchInput): string => (input instanceof Request ? input.url : String(input))

const headersOf = (input: FetchInput, init: RequestInit | undefined): Record<string, string> =>
  Object.fromEntries(new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries())

export function stubGlobalFetch(routes: Record<string, unknown>): FetchStub {
  const fetcher = vi.fn<(input: FetchInput, init?: RequestInit) => Promise<Response>>(async (input) => {
    const url = urlOf(input)
    const key = Object.keys(routes).find((route) => url.includes(route))
    if (key === undefined) return await Promise.resolve(new Response("not found", { status: 404 }))
    const body = routes[key]
    return await Promise.resolve(
      typeof body === "string"
        ? new Response(body, { status: 200 })
        : new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
    )
  })
  vi.stubGlobal("fetch", fetcher)
  return {
    urls: () => fetcher.mock.calls.map(([input]) => urlOf(input)),
    headers: () => fetcher.mock.calls.map(([input, init]) => headersOf(input, init)),
    bodies: () => fetcher.mock.calls.map(([, init]) => (typeof init?.body === "string" ? init.body : "")),
  }
}
