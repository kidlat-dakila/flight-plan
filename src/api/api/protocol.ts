import type { RawTheme } from "@code-hike/lighter"
import type { StoredDocument } from "../../lib/schemas/document/stored"
import type { MissingData, PanelContext } from "../../utils/pr/context"
import type { ReviewedState } from "../utils/reviewed/marks"

/**
 * The HTTP API's routes and response shapes, for the server and the UI.
 *
 * Types and pure helpers only, so the UI can import this without pulling in
 * anything that needs Node. No auth and every origin allowed; the
 * server binds `127.0.0.1` only.
 *
 * - `GET /api/artifact/{id}` → the stored JSON as it is (`StoredDocument`),
 *   or an `ArtifactError` with 404 (`missing`) or 500 (`failed`).
 * - `GET /api/context/{id}` → `PanelContext`: header, notice, links,
 *   coverage, openable, at, prompts.
 * - `GET /api/file?repo&sha&path` → the file's text. No `sha` reads the
 *   checkout's working tree, which is what a plan cites.
 * - `GET /api/theme` → `ThemeResponse`.
 * - `GET /api/setup/sample[/{name}]` → a setup sample's `SetupState`.
 * - `GET /api/reviewed/{id}` → `ReviewedState`; `POST` a `ReviewedRequest`
 *   → the new `ReviewedState`.
 *
 * `{id}` is `{kind}/{owner}/{repo}/{name}`, or `sample`, `sample/{name}`
 *. Each segment is URL-encoded on its own: a branch walkthrough's
 * name already holds `%2F`, which must travel as `%252F`.
 */

export type { StoredDocument }
export type { Coverage, MissingData, PanelContext } from "../../utils/pr/context"
export type { ReviewedState } from "../utils/reviewed/marks"
export type { State as SetupState } from "../../utils/setup/state"

export type ArtifactError =
  | { state: "missing"; missing: MissingData }
  | { state: "failed"; message: string }

export type ReviewedRequest =
  | { op: "mark" | "unmark"; waypoint: string }
  | { op: "mark" | "unmark"; file: string }

export type ThemeResponse = { theme: RawTheme | string }

/** Any error body: a route that failed says why, in one sentence. */
export type ErrorBody = { error: string }

/** An id as a URL path, one encoded segment per id segment. */
export function idPath(id: string): string {
  return id.split("/").map(encodeURIComponent).join("/")
}

/** The UI route that shows a document: `/review-flight-plan/{id}`. */
export function reviewRoute(id: string): string {
  return `/review-flight-plan/${idPath(id)}`
}

export const routes = {
  artifact: (id: string): string => `/api/artifact/${idPath(id)}`,
  context: (id: string): string => `/api/context/${idPath(id)}`,
  reviewed: (id: string): string => `/api/reviewed/${idPath(id)}`,
  theme: (): string => "/api/theme",
  /** A setup sample: `sample` or `sample/{name}`. */
  setup: (id: string): string => `/api/setup/${idPath(id)}`,
  file: (repo: string, sha: string | null, path: string): string => {
    const query = new URLSearchParams({ repo, path })
    if (sha !== null) query.set("sha", sha)
    return `/api/file?${query.toString()}`
  },
}

// Checked here so a change to either shape is a compile error in both places.
export type ApiShapes = {
  artifact: StoredDocument | ArtifactError
  context: PanelContext
  reviewed: ReviewedState
  theme: ThemeResponse
}

/**
 * The webview's API request, carried by the extension.
 *
 * The panel's page runs where VS Code's window is, and the server runs where
 * the extension host is. In a remote window — SSH, a dev container, a cloud
 * workspace — those are two machines, and the page's `127.0.0.1` is the
 * wrong one; `portMapping` did not carry the requests across. So the page
 * hands each request to the extension, which runs beside the server and
 * answers with what the server said.
 */
export type BridgeRequest = {
  type: "api"
  id: number
  method: "GET" | "POST"
  /** `/api/…`, with its query string. */
  route: string
  body?: string
}

export type BridgeReply =
  | { type: "apiReply"; id: number; status: number; contentType: string; body: string }
  /**
   * The server could not be asked. `final` when asking again cannot help
   * (it is not running), so the page says so at once rather than retrying.
   */
  | { type: "apiReply"; id: number; error: string; final: boolean }

/**
 * The URL a bridged request goes to, or null when it is not one to send.
 *
 * Only `/api/` routes, and only on the server's own origin: a message is not
 * trusted to name another host, and a route like `//example.com/x` would.
 */
export function bridgeUrl(origin: string, route: string): string | null {
  if (!route.startsWith("/api/")) return null
  let url: URL
  try {
    url = new URL(route, origin)
  } catch {
    return null
  }
  return url.origin === origin && url.pathname.startsWith("/api/") ? url.toString() : null
}
