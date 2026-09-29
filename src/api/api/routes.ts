import type * as http from "node:http"
import { setupSample, SETUP_SAMPLES } from "../utils/samples/setup"
import { parseId, SAMPLE_SEGMENT } from "../mcp/documentId"
import { applyChange, parseChange, reviewedState, NO_MARKS } from "../utils/reviewed/marks"
import { HttpError, stateKey, type ApiId, type Backend } from "./backend"
import type { ArtifactError, ErrorBody } from "./protocol"

/**
 * The HTTP API, beside `/mcp/{token}` on the same listener.
 *
 * No auth and every origin allowed: the server binds `127.0.0.1`
 * only. Route shapes are in `protocol.ts`. Every response is JSON except
 * `/api/file`, which is the file's text. Nothing is cached by the browser:
 * the UI's own query cache decides what to keep.
 */

const PREFIX = "/api/"

/** The longest request body accepted: a reviewed change is a few bytes. */
const MAX_BODY_BYTES = 64 * 1024

/** How long the `waiting` sample holds a request before it gives up. */
const WAITING_HOLD_MS = 5 * 60 * 1000

function headers(type: string): http.OutgoingHttpHeaders {
  return {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  }
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, headers("application/json; charset=utf-8")).end(JSON.stringify(body))
}

function sendError(response: http.ServerResponse, status: number, message: string): void {
  const body: ErrorBody = { error: message }
  sendJson(response, status, body)
}

/**
 * The id after a route's name, one decoded segment per path segment.
 *
 * Decoded per segment, never as a whole, so a branch name's `%2F` (sent as
 * `%252F`) stays inside its segment.
 */
function idOf(rest: string): ApiId {
  let segments: string[]
  try {
    segments = rest.split("/").map((segment) => decodeURIComponent(segment))
  } catch {
    throw new HttpError(400, "The id is not a valid URL path.")
  }
  if (segments[0] === SAMPLE_SEGMENT) {
    if (segments.length > 2) throw new HttpError(404, `No sample is called "${segments.slice(1).join("/")}".`)
    return { sample: segments[1] ?? "" }
  }
  const stored = parseId(segments.join("/"))
  if (stored === null) {
    throw new HttpError(404, `"${segments.join("/")}" is not a document id. Ids are {kind}/{owner}/{repo}/{name}.`)
  }
  return { stored }
}

function readBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "The request body is too large."))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on("error", reject)
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown)
      } catch {
        reject(new HttpError(400, "The request body is not JSON."))
      }
    })
  })
}

async function artifact(
  backend: Backend,
  id: ApiId,
  query: URLSearchParams,
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  let result
  try {
    result = await backend.artifact(id, query)
  } catch (cause) {
    if (cause instanceof HttpError) throw cause
    // Storage that is not set up, a folder that cannot be read: the reader
    // sees the sentence, in the panel.
    const body: ArtifactError = { state: "failed", message: cause instanceof Error ? cause.message : String(cause) }
    sendJson(response, 500, body)
    return
  }
  switch (result.state) {
    case "document":
      sendJson(response, 200, result.document)
      return
    case "missing": {
      const body: ArtifactError = { state: "missing", missing: result.missing }
      sendJson(response, 404, body)
      return
    }
    case "failed": {
      const body: ArtifactError = { state: "failed", message: result.message }
      sendJson(response, 500, body)
      return
    }
    case "waiting": {
      // Held open, as a slow read would be, until the client gives up.
      const timer = setTimeout(() => {
        sendError(response, 503, "Still waiting.")
      }, WAITING_HOLD_MS)
      request.once("close", () => {
        clearTimeout(timer)
      })
      return
    }
  }
}

async function reviewed(
  backend: Backend,
  id: ApiId,
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  const found = await backend.artifact(id, new URLSearchParams())
  if (found.state !== "document") {
    throw new HttpError(404, "There is no document here to mark.")
  }
  const document = found.document
  const key = stateKey(id)
  const stored = await backend.reviewed.read(key)
  const marks = stored ?? backend.seedReviewed(id, document) ?? NO_MARKS

  if (request.method === "GET") {
    sendJson(response, 200, reviewedState(document, marks))
    return
  }

  const change = parseChange(await readBody(request))
  if (change === null) {
    throw new HttpError(400, 'Send { "op": "mark" | "unmark", "waypoint": id } or { "op", "file": path }.')
  }
  const next = applyChange(document, marks, change)
  await backend.reviewed.write(key, next)
  sendJson(response, 200, reviewedState(document, next))
}

/**
 * Answers a request if it is for the API. False when it is not, so the caller
 * can try its other routes.
 */
export async function handleApi(
  backend: Backend,
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1")
  if (!url.pathname.startsWith(PREFIX)) return false

  if (request.method === "OPTIONS") {
    response
      .writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      })
      .end()
    return true
  }

  const [route = "", ...restSegments] = url.pathname.slice(PREFIX.length).split("/")
  const rest = restSegments.join("/")
  const query = url.searchParams

  try {
    const allowed = route === "reviewed" ? ["GET", "POST"] : ["GET"]
    if (!allowed.includes(request.method ?? "")) {
      response.setHeader("allow", allowed.join(", "))
      throw new HttpError(405, `${route} takes ${allowed.join(" or ")}.`)
    }
    switch (route) {
      case "artifact":
        await artifact(backend, idOf(rest), query, request, response)
        return true
      case "context":
        sendJson(response, 200, await backend.context(idOf(rest), query))
        return true
      case "reviewed":
        await reviewed(backend, idOf(rest), request, response)
        return true
      case "theme":
        sendJson(response, 200, { theme: await backend.theme() })
        return true
      case "setup": {
        // Samples only: in VS Code the extension builds the setup
        // state, because the setup view must work before this server runs.
        const id = idOf(rest)
        if (!("sample" in id)) {
          throw new HttpError(404, "Setup is read from VS Code. The API serves only the setup samples: /api/setup/sample/{name}.")
        }
        const state = setupSample(id.sample)
        if (state === null) {
          throw new HttpError(404, `No setup sample is called "${id.sample}". There are: ${SETUP_SAMPLES.join(", ")}.`)
        }
        sendJson(response, 200, state)
        return true
      }
      case "file": {
        const repo = query.get("repo")
        const path = query.get("path")
        if (repo === null || repo === "" || path === null || path === "") {
          throw new HttpError(400, "Name a repo and a path: /api/file?repo=owner/name&sha=…&path=…")
        }
        const sha = query.get("sha")
        const text = await backend.file(repo, sha === "" ? null : sha, path)
        response.writeHead(200, headers("text/plain; charset=utf-8")).end(text)
        return true
      }
      default:
        throw new HttpError(404, `No API route is called "${route}".`)
    }
  } catch (cause) {
    if (response.headersSent) return true
    if (cause instanceof HttpError) sendError(response, cause.status, cause.message)
    else sendError(response, 500, cause instanceof Error ? cause.message : String(cause))
    return true
  }
}
