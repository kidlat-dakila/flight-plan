import { parseGitAdapterSelection, setGitAdapterSelection } from "../../utils/git-adapter/helpers/session"
import { log } from "../utils/log"
import type { OpenRequest } from "./control"

/**
 * The server's end of the control channel to the extension that spawned it.
 *
 * The server talks to agents over HTTP, so its stdio is free, and the parent
 * reads its stdout and writes its stdin. Out: `{ready}` (in `server.ts`),
 * `{open}` and `{completed}`. In: `{adapter}`, the adapter selection and its
 * credential (see `adapter/session.ts`).
 *
 * Nothing here waits for the other end. `open` and `completed` are
 * announcements the server cannot know the outcome of, and a tool stalled on a
 * window that may not exist is worse than a panel that did not open.
 *
 * It once carried a question as well — `{ask}` for a pull request's title and
 * head, answered with the extension's adapter. The extension now hands the
 * server the adapter itself, so the server looks the pull request up on its own
 * and there is nothing left to ask.
 */

/** What the server tells the extension. One JSON object per line. */
export type ServerLine =
  | { open: OpenRequest }
  /** A document's `complete` succeeded. `id` is its `{id}` (`documentId.ts`). */
  | { completed: { id: string } }

export function tell(line: ServerLine): void {
  log("info", "channel.tell", { line })
  try {
    process.stdout.write(`${JSON.stringify(line)}\n`)
  } catch {
    // The parent is gone. Nothing is listening, so there is nobody to tell.
  }
}

/** What the extension tells the server. */
export type ExtensionLine = { forge: unknown }

/** Applies one line from the extension; anything else is ignored. */
export function receive(line: string): void {
  if (!line.includes('"forge"')) return
  let parsed: Partial<ExtensionLine>
  try {
    parsed = JSON.parse(line) as Partial<ExtensionLine>
  } catch {
    return
  }
  if (!("forge" in parsed)) return
  // `null` withdraws the selection; a malformed one is dropped, so the adapter
  // the server had stays until a readable one arrives.
  if (parsed.forge === null) {
    setGitAdapterSelection(null)
    log("info", "channel.forge", { gitAdapter: null })
    return
  }
  const selection = parseGitAdapterSelection(parsed.forge)
  // Which adapter, and whether a credential came with it; never the credential.
  log(selection === null ? "warn" : "info", "channel.forge", {
    gitAdapter: selection?.id ?? "unreadable",
    credential: selection?.secret != null && selection.secret !== "",
  })
  if (selection !== null) setGitAdapterSelection(selection)
}

let listening = false

/**
 * Starts reading stdin, once.
 *
 * Called by `main()` only: under test stdin is the runner's.
 */
export function listenToExtension(): void {
  if (listening) return
  listening = true
  let buffer = ""
  process.stdin.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8")
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) receive(line)
  })
  // Reading stdin keeps the process alive; the server lives as long as its
  // parent, so that is wanted.
  process.stdin.resume()
}
