import type { Provider } from "@agntn/forges"
import { GitAdapterError, type GitAdapterProblem } from "../../lib/git-adapter/types"

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_SERVER_ERROR = 500

export function splitRepo(repo: string): { owner: string; name: string } {
  const slash = repo.lastIndexOf("/")
  return { owner: repo.slice(0, slash), name: repo.slice(slash + 1) }
}

function problemForStatus(status: number | undefined): GitAdapterProblem {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) return "auth"
  if (status === HTTP_NOT_FOUND) return "no-repo"
  if (status !== undefined && status >= HTTP_SERVER_ERROR) return "network"
  return "unknown"
}

export function toGitAdapterError(cause: unknown): GitAdapterError {
  if (cause instanceof GitAdapterError) return cause
  const wrapped = (cause as { originalError?: unknown } | null)?.originalError
  if (wrapped instanceof GitAdapterError) return wrapped
  const status =
    cause instanceof Error && "status" in cause
      ? Number((cause as { status?: unknown }).status) || undefined
      : undefined
  const message = cause instanceof Error ? cause.message : String(cause)
  return new GitAdapterError(message, problemForStatus(status))
}

export async function readFileAt(
  provider: Provider,
  repo: string,
  path: string,
  sha: string,
): Promise<string> {
  const { owner, name } = splitRepo(repo)
  let text = ""
  let offset = 0
  for (;;) {
    const slice = await provider.repos.readContents(owner, name, path, {
      ref: sha,
      offset,
    })
    if (slice.type !== "file") {
      throw new GitAdapterError(`${path} is a directory, not a file.`, "no-repo")
    }
    text += slice.content
    if (slice.nextOffset === null) return text
    offset = slice.nextOffset
  }
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
