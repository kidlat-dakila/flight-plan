import { queryOptions, type QueryClient } from "@tanstack/react-query"
import {
  routes,
  type ArtifactError,
  type MissingData,
  type PanelContext,
  type ReviewedRequest,
  type ReviewedState,
  type SetupState,
  type StoredDocument,
  type ThemeResponse,
} from "../../api/api/protocol"

/**
 * The UI's side of the HTTP API.
 *
 * Every JSON artifact is read through TanStack Query, with one rule per kind of
 * data: the document refreshes while it is still being written, the context
 * with it, and a file at a commit never changes, so it is read once.
 */

/**
 * How a request reaches the API: one route in, one `Response` out.
 *
 * Every query goes through it, so TanStack Query sees the same answers
 * whichever way they travelled. It throws when the API could not be asked.
 */
export type Transport = (route: string, init: { method: "GET" | "POST"; body?: string; signal?: AbortSignal }) => Promise<Response>

/**
 * The browser's transport: `fetch` to the API. `pnpm dev` runs it on 5198;
 * `VITE_FLIGHTPLAN_API` points elsewhere.
 */
const BASE = (import.meta.env["VITE_FLIGHTPLAN_API"] as string | undefined) ?? "http://127.0.0.1:5198"

const fetchTransport: Transport = async (route, init) => {
  try {
    return await fetch(`${BASE}${route}`, {
      method: init.method,
      ...(init.body === undefined ? {} : { body: init.body, headers: { "content-type": "application/json" } }),
      ...(init.signal === undefined ? {} : { signal: init.signal }),
    })
  } catch (cause) {
    if (init.signal?.aborted === true) throw cause
    throw new ApiError(
      `The Flight Plan API did not answer at ${BASE}. Start it with pnpm dev, or pnpm dev:api beside another UI server.`,
      false,
    )
  }
}

let transport: Transport = fetchTransport

/** The theme from somewhere other than `/api/theme`: the webview's extension. */
let readTheme: (() => Promise<ThemeResponse["theme"]>) | null = null

/**
 * The webview's setup: its requests go through the extension, which runs
 * beside the server, and its theme comes from
 * the extension too.
 */
export function configureApi(options: { transport: Transport; theme?: () => Promise<ThemeResponse["theme"]> }): void {
  transport = options.transport
  readTheme = options.theme ?? null
}

/** How often a document that is not complete is fetched again. */
export const DRAFTING_POLL_MS = 1000

/** A route's answer that is not a document: the panel states. */
export type Artifact =
  | { state: "document"; document: StoredDocument }
  | { state: "missing"; missing: MissingData }
  | { state: "failed"; message: string }

/**
 * A request that failed in a way the reader should read.
 *
 * `answered` tells a refusal from an API that is not there: a refusal is the
 * API's final word and is not asked again, an unreachable API is.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly answered: boolean,
  ) {
    super(message)
  }
}

/** The query client's retry rule: retry only what the API never answered. */
export function shouldRetry(failures: number, error: unknown): boolean {
  if (error instanceof ApiError && error.answered) return false
  return failures < 2
}

function get(route: string, signal?: AbortSignal): Promise<Response> {
  return transport(route, { method: "GET", ...(signal === undefined ? {} : { signal }) })
}

async function errorOf(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return new ApiError(body?.error ?? `The API answered ${String(response.status)}.`, true)
}

/** The query string the sample routes pass through; empty for a stored id. */
export type SampleQuery = { step?: number; stale?: string; bare?: boolean }

export function queryString(query: SampleQuery): string {
  const out = new URLSearchParams()
  if (query.step !== undefined) out.set("step", String(query.step))
  if (query.stale !== undefined) out.set("stale", query.stale)
  if (query.bare === true) out.set("bare", "")
  const text = out.toString()
  return text === "" ? "" : `?${text}`
}

/**
 * Polled every second until the document is complete, and then no more.
 *
 * Until then whatever the answer is: a document still `drafting`, but also
 * "missing" (the agent has not stored one yet), "failed", no answer at all,
 * or nothing yet. Each of those can turn into the document a moment later —
 * an agent's `start` stores the opening and the scaffold fills it in — and a
 * panel that stopped asking would sit on the old answer until reopened.
 */
export function draftingInterval(data: Artifact | undefined): number | false {
  return data?.state === "document" && data.document.meta.status === "complete" ? false : DRAFTING_POLL_MS
}

export function artifactQuery(id: string, query: SampleQuery = {}) {
  return queryOptions({
    queryKey: ["artifact", id, query],
    queryFn: async ({ signal }): Promise<Artifact> => {
      const response = await get(`${routes.artifact(id)}${queryString(query)}`, signal)
      const body = (await response.json().catch(() => null)) as
        | StoredDocument
        | ArtifactError
        | { error: string }
        | null
      if (body === null) throw new ApiError(`The API answered ${String(response.status)} with no JSON.`, true)
      if ("error" in body) throw new ApiError(body.error, true)
      if ("state" in body) return body.state === "missing" ? body : { state: "failed", message: body.message }
      return { state: "document", document: body }
    },
    refetchInterval: (query) => draftingInterval(query.state.data),
    /*
     * Also while the page is hidden. TanStack skips interval refetches in the
     * background by default, and a VS Code panel that is not the front tab is
     * a hidden page: it missed every piece the scaffold wrote while the reader
     * looked at something else. The request is local, so the cost is small.
     */
    refetchIntervalInBackground: true,
  })
}

export function contextQuery(id: string, query: SampleQuery = {}) {
  return queryOptions({
    queryKey: ["context", id, query],
    queryFn: async ({ signal }): Promise<PanelContext> => {
      const response = await get(`${routes.context(id)}${queryString(query)}`, signal)
      if (!response.ok) throw await errorOf(response)
      return (await response.json()) as PanelContext
    },
  })
}

/** A file at a commit never changes: read once, kept for the session. */
export function fileQuery(repo: string, sha: string | null, path: string) {
  return queryOptions({
    queryKey: ["file", repo, sha, path],
    queryFn: async ({ signal }): Promise<string> => {
      const response = await get(routes.file(repo, sha, path), signal)
      if (!response.ok) throw await errorOf(response)
      return await response.text()
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export function themeQuery() {
  return queryOptions({
    queryKey: ["theme"],
    queryFn: async ({ signal }): Promise<ThemeResponse["theme"]> => {
      if (readTheme !== null) return await readTheme()
      const response = await get(routes.theme(), signal)
      if (!response.ok) throw await errorOf(response)
      return ((await response.json()) as ThemeResponse).theme
    },
    staleTime: Number.POSITIVE_INFINITY,
  })
}

/** A setup sample for `/setup` in a browser. */
export function setupQuery(id: string) {
  return queryOptions({
    queryKey: ["setup", id],
    queryFn: async ({ signal }): Promise<SetupState> => {
      const response = await get(routes.setup(id), signal)
      if (!response.ok) throw await errorOf(response)
      return (await response.json()) as SetupState
    },
  })
}

export function reviewedQuery(id: string) {
  return queryOptions({
    queryKey: ["reviewed", id],
    queryFn: async ({ signal }): Promise<ReviewedState> => {
      const response = await get(routes.reviewed(id), signal)
      if (!response.ok) throw await errorOf(response)
      return (await response.json()) as ReviewedState
    },
  })
}

/** Marks or unmarks, then invalidates the reviewed query. */
export async function changeReviewed(client: QueryClient, id: string, change: ReviewedRequest): Promise<ReviewedState> {
  const response = await transport(routes.reviewed(id), { method: "POST", body: JSON.stringify(change) })
  if (!response.ok) throw await errorOf(response)
  const state = (await response.json()) as ReviewedState
  client.setQueryData(reviewedQuery(id).queryKey, state)
  await client.invalidateQueries({ queryKey: reviewedQuery(id).queryKey })
  return state
}
