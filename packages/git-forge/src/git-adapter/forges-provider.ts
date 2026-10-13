import type { Provider } from "@agntn/forges"
import { GitAdapterError, type GitAdapterProblem } from "@/git-adapter/types"

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_SERVER_ERROR = 500

export function splitRepo(repo: string): { owner: string, name: string } {
  const slash = repo.lastIndexOf("/")
  return { owner: repo.slice(0, slash), name: repo.slice(slash + 1) }
}

function problemForStatus(status: number | undefined): GitAdapterProblem {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) return "auth"
  if (status === HTTP_NOT_FOUND) return "no-repo"
  if (status !== undefined && status >= HTTP_SERVER_ERROR) return "network"
  return "unknown"
}

function numericField(cause: unknown, field: string): number | undefined {
  const value: unknown = typeof cause === "object" && cause !== null ? Reflect.get(cause, field) : undefined
  return Number(value) || undefined
}

export function toGitAdapterError(cause: unknown): GitAdapterError {
  if (cause instanceof GitAdapterError) return cause
  const wrapped: unknown = typeof cause === "object" && cause !== null ? Reflect.get(cause, "originalError") : undefined
  if (wrapped instanceof GitAdapterError) return wrapped
  const status = cause instanceof Error ? numericField(cause, "status") : undefined
  const message = cause instanceof Error ? cause.message : String(cause)
  return new GitAdapterError(message, problemForStatus(status))
}

async function readSlices(
  provider: Provider,
  coordinates: { owner: string, name: string, path: string, sha: string },
  offset: number,
  textSoFar: string,
): Promise<string> {
  const slice = await provider.repos.readContents(coordinates.owner, coordinates.name, coordinates.path, {
    ref: coordinates.sha,
    offset,
  })
  if (slice.type !== "file") {
    throw new GitAdapterError(`${coordinates.path} is a directory, not a file.`, "no-repo")
  }
  const text = `${textSoFar}${slice.content}`
  return slice.nextOffset === null ? text : await readSlices(provider, coordinates, slice.nextOffset, text)
}

export async function readFileAt(
  provider: Provider,
  repo: string,
  path: string,
  sha: string,
): Promise<string> {
  const { owner, name } = splitRepo(repo)
  return await readSlices(provider, { owner, name, path, sha }, 0, "")
}

export async function readHeadSha(
  provider: Provider,
  repo: string,
  number: number,
): Promise<string> {
  const { owner, name } = splitRepo(repo)
  return (await provider.pullRequests.get(owner, name, number)).headSha
}

const REASON_SEPARATOR = " "

function fieldOf(holder: unknown, field: string): unknown {
  return typeof holder === "object" && holder !== null ? Reflect.get(holder, field) : undefined
}

function textsIn(value: unknown): string[] {
  if (typeof value === "string") return value.trim() === "" ? [] : [value.trim()]
  if (Array.isArray(value)) return value.flatMap(textsIn)
  if (typeof value !== "object" || value === null) return []
  const message = textsIn(fieldOf(value, "message"))
  return message.length > 0 ? message : Object.values(value).flatMap(textsIn)
}

function responseBodyOf(cause: unknown): unknown {
  return fieldOf(cause, "data") ?? fieldOf(fieldOf(cause, "originalError"), "data")
}

export function forgeReasonOf(cause: unknown): string | null {
  const body = responseBodyOf(cause)
  const details = [...textsIn(fieldOf(body, "errors")), ...textsIn(fieldOf(body, "error"))]
  const reasons = details.length > 0 ? details : textsIn(fieldOf(body, "message"))
  return reasons.length === 0 ? null : [...new Set(reasons)].join(REASON_SEPARATOR)
}

function statusOf(cause: unknown): number | undefined {
  return numericField(cause, "status") ?? numericField(fieldOf(cause, "originalError"), "status")
}

export function toRefusal(cause: unknown): GitAdapterError {
  if (cause instanceof GitAdapterError) return cause
  const reason = forgeReasonOf(cause)
  return reason === null ? toGitAdapterError(cause) : new GitAdapterError(reason, problemForStatus(statusOf(cause)))
}

export async function orThrowRefusal<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  } catch (cause) {
    throw toRefusal(cause)
  }
}

export async function orThrowGitAdapterError<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  } catch (cause) {
    throw toGitAdapterError(cause)
  }
}
