import { GIT_ADAPTER_IDS, assembleGitAdapter, type Resolved } from "./assemble"
import type { GitAdapterId } from "../../../lib/git-adapter/types"

/**
 * The adapter the extension handed this server process.
 *
 * The extension holds the choice (settings) and the credential (the OS
 * keychain, through SecretStorage); the server holds neither. So the extension
 * sends both down the control channel when the server starts and whenever
 * either changes, and the server builds the adapter for a checkout from them.
 *
 * **In memory only.** The credential is never written to disk here, never
 * logged, and never returned by any route: it lives as long as this process
 * does, and a restarted server waits for the extension to send it again.
 *
 * Until one arrives the server uses the setting's default, plain git, which
 * needs no credential: under test nothing sends a selection, and a server
 * that just started has not been sent one yet.
 */

export type GitAdapterSelection = {
  id: GitAdapterId
  baseUrl: string
  /** The Bitbucket username; "" when unset. */
  username: string
  /** Null when none is stored, and always for git. */
  secret: string | null
}

const DEFAULT_SELECTION: GitAdapterSelection = { id: "git", baseUrl: "", username: "", secret: null }

let selection: GitAdapterSelection = DEFAULT_SELECTION

/**
 * One adapter per checkout, until the selection changes.
 *
 * `assembleGitAdapter` reads the checkout's remote, which is a process spawn; a
 * panel asks for the same checkout several times per open.
 */
const built = new Map<string, Promise<Resolved>>()

/** Replaces the selection; null goes back to the default. */
export function setGitAdapterSelection(next: GitAdapterSelection | null): void {
  selection = next ?? DEFAULT_SELECTION
  built.clear()
}

/** The adapter for a checkout, or the reason there is none. Never rejects. */
export function gitAdapterFor(root: string): Promise<Resolved> {
  let pending = built.get(root)
  if (pending === undefined) {
    pending = assembleGitAdapter({ ...selection, root })
    built.set(root, pending)
  }
  return pending
}

/**
 * A `{adapter}` control line's payload, checked, or null.
 *
 * The line comes from the parent process, but it is still parsed text: a
 * malformed one is dropped rather than half-applied.
 */
export function parseGitAdapterSelection(value: unknown): GitAdapterSelection | null {
  if (value === null || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const id = record["id"]
  if (typeof id !== "string" || !(GIT_ADAPTER_IDS as readonly string[]).includes(id)) return null
  const secret = record["secret"]
  return {
    id: id as GitAdapterId,
    baseUrl: typeof record["baseUrl"] === "string" ? record["baseUrl"] : "",
    username: typeof record["username"] === "string" ? record["username"] : "",
    secret: typeof secret === "string" && secret !== "" ? secret : null,
  }
}
