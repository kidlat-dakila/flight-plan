import { GitAdapterError, type Fetcher, type GitAdapterProblem } from "../../../lib/git-adapter/types"

/**
 * One HTTP layer for every adapter that speaks REST.
 *
 * Written against `fetch` rather than adopting a client per host, and that was
 * measured rather than assumed. The three official clients cost about 65 KB
 * gzipped between them, and all three fall back to raw HTTP for the single most
 * important call this extension makes — the unified diff of a change. GitHub
 * types its diff response as the pull request object, so the body is cast to a
 * string anyway; GitLab's client does not expose the `raw_diffs` endpoint at
 * all; Bitbucket's returns `text/plain` behind a redirect. Three clients that
 * each need an escape hatch for the main road are three dependencies buying
 * very little.
 *
 * What they *do* buy is pagination and error mapping, which is what this file
 * is. One place to retry, one place to turn a status code into something a
 * reader can act on, and one place where a proxy or a self-signed certificate
 * on an on-premise instance can be dealt with for all three at once.
 */

export type RestConfig = {
  /** No trailing slash. Paths are appended to this. */
  baseUrl: string
  /** Sent on every request. Auth belongs here. */
  headers: Record<string, string>
  /** For prose in errors: "GitLab", "Bitbucket". */
  name: string
  fetcher?: Fetcher
  /**
   * How to wait between retries.
   *
   * Injected so a test can assert the delay that was *asked for* rather than
   * sit through it. Waiting out a real backoff in a test proves only that
   * `setTimeout` works, and it makes the one piece of logic that can hang a
   * panel the slowest thing in the suite — which is how it ends up untested.
   */
  sleep?: (ms: number) => Promise<void>
}

/**
 * What a status code means, in the vocabulary the views already speak.
 *
 * 403 is deliberately `auth` rather than a category of its own. On all three
 * hosts it is overwhelmingly a token that is missing a scope, and the answer to
 * that is the same as the answer to a missing token: go to setup. A rate limit
 * also arrives as 403 on GitHub, which is why the retry happens before this is
 * ever reached.
 */
function problemFor(status: number): GitAdapterProblem {
  if (status === 401 || status === 403) return "auth"
  if (status === 404) return "no-repo"
  if (status >= 500) return "network"
  return "unknown"
}

/** Whether it is worth trying again, and how long to wait first. */
function retryAfter(response: Response, attempt: number): number | null {
  if (response.status !== 429 && response.status < 500) return null
  if (attempt >= 3) return null
  const header = response.headers.get("retry-after")
  if (header !== null) {
    const seconds = Number(header)
    // Capped. A host is entitled to ask for an hour, and a panel that hangs for
    // an hour is indistinguishable from one that is broken.
    if (Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, MAX_RETRY_WAIT_MS)
    }
  }
  return 500 * 2 ** attempt
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** The longest a host may make the panel wait, however politely it asks. */
export const MAX_RETRY_WAIT_MS = 30_000

export type Rest = {
  /** A JSON response body. */
  json: <T>(path: string, init?: RequestInit) => Promise<T>
  /** The raw response, after retries and error mapping. */
  request: (path: string, init?: RequestInit) => Promise<Response>
  /** A response body as text: diffs and raw file contents. */
  text: (path: string, init?: RequestInit) => Promise<string>
}

export function createRest(config: RestConfig): Rest {
  const fetcher: Fetcher = config.fetcher ?? ((input, init) => fetch(input, init))
  const sleep = config.sleep ?? pause
  const base = config.baseUrl.replace(/\/+$/, "")

  const url = (path: string): string =>
    /^https?:\/\//i.test(path) ? path : `${base}/${path.replace(/^\/+/, "")}`

  const send = async (path: string, init?: RequestInit): Promise<Response> => {
    const target = url(path)
    for (let attempt = 0; ; attempt += 1) {
      let response: Response
      try {
        response = await fetcher(target, {
          ...init,
          headers: { ...config.headers, ...(init?.headers ?? {}) },
        })
      } catch (cause) {
        // No response at all: DNS, TLS, a proxy, or the host being unreachable.
        // Named as network rather than unknown, because the answer is "try
        // again later" and not "check your token".
        throw new GitAdapterError(
          `${config.name} could not be reached: ${String(cause)}`,
          "network",
        )
      }

      if (response.ok) return response

      const wait = retryAfter(response, attempt)
      if (wait !== null) {
        await sleep(wait)
        continue
      }

      // The body first: all three hosts put a usable sentence in it, and the
      // status text alone ("Forbidden") never says which scope was missing.
      const detail = await response.text().catch(() => "")
      const trimmed = detail.trim().slice(0, 400)
      throw new GitAdapterError(
        `${config.name} answered ${String(response.status)}${
          trimmed === "" ? "" : `: ${trimmed}`
        }`,
        problemFor(response.status),
      )
    }
  }

  return {
    request: send,

    json: async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await send(path, init)
      return (await response.json()) as T
    },

    text: async (path: string, init?: RequestInit): Promise<string> => {
      const response = await send(path, init)
      return response.text()
    },
  }
}
