import { GitAdapterError, type Fetcher, type GitAdapterProblem } from "@/git-adapter/types"

export interface RestConfig {
  baseUrl: string
  headers: Record<string, string>
  name: string
  fetcher?: Fetcher
  sleep?: (ms: number) => Promise<void>
}

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVER_ERROR = 500
const MAX_RETRIES = 3
const MS_PER_SECOND = 1000
const BASE_RETRY_WAIT_MS = 500
const RETRY_BACKOFF_FACTOR = 2
const MAX_ERROR_DETAIL_LENGTH = 400
const DEFAULT_METHOD = "GET"

export const MAX_RETRY_WAIT_MS = 30_000

function problemFor(status: number): GitAdapterProblem {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) return "auth"
  if (status === HTTP_NOT_FOUND) return "no-repo"
  if (status >= HTTP_SERVER_ERROR) return "network"
  return "unknown"
}

function retryAfter(response: Response, attempt: number): number | null {
  if (response.status !== HTTP_TOO_MANY_REQUESTS && response.status < HTTP_SERVER_ERROR) return null
  if (attempt >= MAX_RETRIES) return null
  const header = response.headers.get("retry-after")
  if (header !== null) {
    const seconds = Number(header)
    if (Number.isFinite(seconds)) {
      return Math.min(seconds * MS_PER_SECOND, MAX_RETRY_WAIT_MS)
    }
  }
  return BASE_RETRY_WAIT_MS * RETRY_BACKOFF_FACTOR ** attempt
}

async function pause(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

type HeaderSource = ConstructorParameters<typeof Headers>[0]

function mergeHeaders(configured: Record<string, string>, requested: HeaderSource): Headers {
  const merged = new Headers(configured)
  new Headers(requested).forEach((value, name) => {
    merged.set(name, value)
  })
  return merged
}

export interface Rest {
  json: (path: string, init?: RequestInit) => Promise<unknown>
  request: (path: string, init?: RequestInit) => Promise<Response>
  text: (path: string, init?: RequestInit) => Promise<string>
}

export function createRest(config: RestConfig): Rest {
  const fetcher: Fetcher = config.fetcher ?? (async (input, init) => fetch(input, init))
  const sleep = config.sleep ?? pause
  const base = config.baseUrl.replace(/\/+$/, "")

  const url = (path: string): string =>
    /^https?:\/\//i.test(path) ? path : `${base}/${path.replace(/^\/+/, "")}`

  const attemptRequest = async (target: string, init: RequestInit | undefined): Promise<Response> => {
    try {
      return await fetcher(target, { ...init, headers: mergeHeaders(config.headers, init?.headers) })
    } catch (cause) {
      throw new GitAdapterError(`${config.name} could not be reached: ${String(cause)}`, "network")
    }
  }

  const failure = async (response: Response, target: string, init: RequestInit | undefined): Promise<GitAdapterError> => {
    const detail = await response.text().catch(() => "")
    const trimmed = detail.trim().slice(0, MAX_ERROR_DETAIL_LENGTH)
    const request = `${(init?.method ?? DEFAULT_METHOD).toUpperCase()} ${new URL(target).pathname}`
    return new GitAdapterError(
      `${config.name} answered ${String(response.status)} to ${request}${trimmed === "" ? "" : `: ${trimmed}`}`,
      problemFor(response.status),
    )
  }

  const send = async (path: string, init: RequestInit | undefined, attempt: number): Promise<Response> => {
    const target = url(path)
    const response = await attemptRequest(target, init)
    if (response.ok) return response
    const wait = retryAfter(response, attempt)
    if (wait === null) throw await failure(response, target, init)
    await sleep(wait)
    return await send(path, init, attempt + 1)
  }

  return {
    request: async (path, init) => await send(path, init, 0),

    json: async (path, init) => {
      const response = await send(path, init, 0)
      return await response.json()
    },

    text: async (path, init) => {
      const response = await send(path, init, 0)
      return await response.text()
    },
  }
}
