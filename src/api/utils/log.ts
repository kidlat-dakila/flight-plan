import * as fs from "node:fs"
import * as path from "node:path"

/**
 * The server's log: one JSON object per line, in a file beside the server
 * (`<server>/logs/server.log`, or `.flightplan-dev/server.log` under
 * `pnpm dev`).
 *
 * A file, because the server is a child process with no window: its stderr
 * reaches only the extension host's console, and a failure that happens after
 * a tool call has answered — a scaffold that fails once `start` stopped
 * waiting — had nowhere to be read at all.
 *
 * What never goes in: a credential, the MCP token (redacted from paths by
 * `redactPath`), and document or file text. Ids, routes, durations, steps and
 * error messages do.
 *
 * Writes are appended in order and never throw: a log that cannot be written
 * must not take the server down. Until `openLog` names a file (tests), nothing
 * is written.
 */

export type Level = "info" | "warn" | "error"

/** One file of this size, then it is renamed to `.1` (replacing the last). */
const MAX_BYTES = 5 * 1024 * 1024

let file: string | null = null
let written = 0
let queue: Promise<void> = Promise.resolve()

/** The version this server was built as; `dev` when not built by esbuild. */
declare const __FLIGHTPLAN_VERSION__: string | undefined
export const SERVER_VERSION: string = typeof __FLIGHTPLAN_VERSION__ === "string" ? __FLIGHTPLAN_VERSION__ : "dev"

/** Starts writing to `target`, creating its folder. Returns the path. */
export function openLog(target: string): string {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  file = target
  written = fs.existsSync(target) ? fs.statSync(target).size : 0
  return target
}

/** The file being written, or null when the log is off. */
export function logFile(): string | null {
  return file
}

/** `/mcp/<token>` as `/mcp/…`: the token is a capability and never logged. */
export function redactPath(url: string): string {
  return url.replace(/^\/mcp\/[^/?#]+/, "/mcp/…")
}

/** An error as fields: its message, and its stack for anything unexpected. */
export function errorFields(cause: unknown): { error: string; stack?: string } {
  if (cause instanceof Error) {
    return { error: cause.message, ...(cause.stack === undefined ? {} : { stack: cause.stack }) }
  }
  return { error: String(cause) }
}

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const target = file
  if (target === null) return
  let line: string
  try {
    line = `${JSON.stringify({ t: new Date().toISOString(), level, event, ...fields })}\n`
  } catch {
    line = `${JSON.stringify({ t: new Date().toISOString(), level, event, unserializable: true })}\n`
  }
  queue = queue.then(async () => {
    try {
      if (written + line.length > MAX_BYTES) {
        await fs.promises.rename(target, `${target}.1`).catch(() => undefined)
        written = 0
      }
      await fs.promises.appendFile(target, line, "utf8")
      written += Buffer.byteLength(line)
    } catch {
      // The disk is full or the folder went away. Nothing to report it to.
    }
  })
}

/** Waits until every line so far is on disk. For tests and shutdown. */
export function flushLog(): Promise<void> {
  return queue
}
