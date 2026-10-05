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

export async function orThrowGitAdapterError<T>(work: Promise<T>): Promise<T> {
  try {
    return await work
  } catch (cause) {
    throw toGitAdapterError(cause)
  }
}
