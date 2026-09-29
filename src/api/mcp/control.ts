import type { ChildProcess } from "node:child_process"
import type { GitAdapterSelection } from "../../utils/git-adapter/helpers/session"
import type { WalkthroughKey } from "./storage"

/**
 * The control channel between the extension and the server process it
 * spawns: `{ready}`, `{open}` and `{completed}` lines on the server's stdout,
 * and `{adapter}` lines on its stdin. This is the extension's end; the server's
 * end is `channel.ts`. Nothing here needs VS Code:
 * `src/vscode/serverProcess.ts` spawns the process and passes the handlers in.
 */

/** The URL an agent is given for a server on this port with this token. */
export function mcpUrl(port: number, token: string): string {
  return `http://127.0.0.1:${port}/mcp/${token}`
}

/** What the server asks the extension to open. */
export type OpenRequest =
  // `ref` rather than a number, because a walkthrough may be filed under a
  // branch: somebody reviewing with plain git has no pull request to name.
  | { kind: "walkthrough"; repo: string; ref: WalkthroughKey }
  | { kind: "plan"; repo: string; name: string }

/**
 * Hands the server the adapter selection and its credential, or withdraws it.
 *
 * Down stdin, never in the environment or on disk: the credential then lives
 * in the two processes' memory only.
 */
export function sendGitAdapter(child: ChildProcess, selection: GitAdapterSelection | null): void {
  try {
    child.stdin?.write(`${JSON.stringify({ forge: selection })}\n`)
  } catch {
    // The child is gone, or its stdin is closed. A new one is sent the
    // selection when it starts.
  }
}

/** Who handles the control lines. Read on every line. */
export type ControlHandlers = {
  open(request: OpenRequest): void
  /** A document's `complete` succeeded; `id` is its `{id}`. */
  completed(id: string): void
}

/**
 * Hands one stdout line to its handler.
 *
 * Anything that is not a control line is dropped. The server writes nothing
 * else to stdout, but a stray write from a dependency should not take the
 * extension down.
 */
export function readControlLine(line: string, handlers: ControlHandlers): void {
  if (!line.includes('"open"') && !line.includes('"completed"')) return
  let parsed: { open?: OpenRequest; completed?: { id?: unknown } }
  try {
    parsed = JSON.parse(line) as typeof parsed
  } catch {
    return
  }
  if (parsed === null || typeof parsed !== "object") return
  if (parsed.open !== undefined) handlers.open(parsed.open)
  const id = parsed.completed?.id
  if (typeof id === "string" && id !== "") handlers.completed(id)
}

/** Reads the control lines the server writes after it is up. */
export function watchControl(child: ChildProcess, handlers: ControlHandlers): void {
  let buffer = ""
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8")
    const lines = buffer.split("\n")
    // Whatever follows the last newline is a partial line; keep it.
    buffer = lines.pop() ?? ""
    for (const line of lines) readControlLine(line, handlers)
  })
}

/**
 * Waits for the server to report the port it bound.
 *
 * It may not be the one requested: on a first run the request is 0 and the
 * system chooses. The answer is then remembered, so agents keep working across
 * restarts.
 */
export function firstReadyLine(child: ChildProcess): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let buffer = ""
    const timer = setTimeout(() => {
      reject(new Error("The server did not start within 10 seconds."))
    }, 10_000)
    const done = (fn: () => void) => {
      clearTimeout(timer)
      fn()
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8")
      const line = buffer.split("\n").find((c) => c.includes('"ready"'))
      if (line === undefined) return
      done(() => {
        try {
          resolve((JSON.parse(line) as { ready: { port: number } }).ready.port)
        } catch (cause) {
          reject(cause instanceof Error ? cause : new Error(String(cause)))
        }
      })
    })
    child.once("error", (cause) => done(() => reject(cause)))
    child.once("exit", (code) =>
      done(() => reject(new Error(`The server exited with code ${String(code)}.`))),
    )
  })
}
