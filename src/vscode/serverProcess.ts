import { type ChildProcess, spawn } from "node:child_process"
import * as crypto from "node:crypto"
import * as vscode from "vscode"
import { locations, refreshServer } from "./setup"
import {
  firstReadyLine,
  mcpUrl,
  sendGitAdapter,
  watchControl,
  type OpenRequest,
} from "../api/mcp/control"
import type { GitAdapterSelection } from "../utils/git-adapter/helpers/session"

/**
 * Runs the MCP server for as long as this extension is running.
 *
 * This is what makes the server Flight Plan's rather than each agent's. Under
 * the alternative each agent spawns its own copy, which means two processes
 * writing the same files with no coordination and no way for the server to tell
 * the extension anything.
 *
 * Two consequences are real costs rather than details:
 *
 * - **Nothing works while VS Code is closed.** An agent run from a bare terminal
 *   gets a refused connection. On a remote workspace the workspace outlives the
 *   editor session, so this will happen.
 * - **The port and token must be stable.** Agents keep the whole URL in their own
 *   configuration files. Regenerating either would silently break every agent,
 *   presenting as tools that used to work quietly disappearing. Both are
 *   persisted, and the port is also a setting.
 */

type Running = { child: ChildProcess; port: number; token: string }

let running: Running | null = null

/**
 * Why the last start failed, kept so the setup view can say so.
 *
 * A port already in use is the expected failure, and it is exactly the case
 * where the user needs to change the port. Reporting it only as a transient
 * notification would leave the view showing "not running" with no explanation
 * and nothing to press.
 */
let lastError: string | null = null

export function startupError(): string | null {
  return lastError
}

/**
 * Who to tell when the server asks for something to be opened.
 *
 * Set once at activation. The server has no other way to reach the extension:
 * agents talk to it over HTTP, but this is its own parent, and the line it
 * writes on stdout is a private channel between the two.
 */
let onOpen: ((request: OpenRequest) => void) | null = null

export function setOpenHandler(handler: (request: OpenRequest) => void): void {
  onOpen = handler
}

/** Who to tell when a document is complete: the "review is ready" notification. */
let onCompleted: ((id: string) => void) | null = null

export function setCompletedHandler(handler: (id: string) => void): void {
  onCompleted = handler
}

/**
 * Where the adapter selection comes from: settings and the keychain.
 *
 * Set once at activation, like the open handler, and read every time the
 * selection is sent — at each start, and when `resendGitAdapter` is called because
 * a setting or a credential changed.
 */
let gitAdapterSource: (() => Promise<GitAdapterSelection>) | null = null

export function setGitAdapterSource(source: () => Promise<GitAdapterSelection>): void {
  gitAdapterSource = source
}

/** Sends the current adapter selection to the running server, if any. */
export async function resendGitAdapter(): Promise<void> {
  const current = running
  if (current === null || gitAdapterSource === null) return
  const selection = await gitAdapterSource().catch(() => null)
  // Checked again: the server may have been replaced while the keychain
  // answered, and the new one is sent its own selection at start.
  if (running === current) sendGitAdapter(current.child, selection)
}

const PORT_KEY = "flightPlan.serverPort"
const TOKEN_KEY = "flightPlan.serverToken"

/** The URL an agent is given, or null when the server is not up. */
export function serverUrl(): string | null {
  return running === null ? null : mcpUrl(running.port, running.token)
}

export function isRunning(): boolean {
  return running !== null
}

/** The port currently bound, or null when the server is not up. */
export function serverPort(): number | null {
  return running?.port ?? null
}

/** The port that will be asked for next time, whether or not it is running. */
export function requestedPort(context: vscode.ExtensionContext): number {
  return configuredPort() ?? context.globalState.get<number>(PORT_KEY) ?? 0
}

/**
 * The URL token, generated once and kept.
 *
 * `globalState` rather than `SecretStorage`: it is a capability for a loopback
 * port on this machine, not a credential for anything beyond it, and it has to
 * be readable during activation without involving a keychain.
 */
async function sessionToken(context: vscode.ExtensionContext): Promise<string> {
  const existing = context.globalState.get<string>(TOKEN_KEY)
  if (typeof existing === "string" && existing.length >= 32) return existing
  const token = crypto.randomBytes(16).toString("hex")
  await context.globalState.update(TOKEN_KEY, token)
  return token
}

function configuredPort(): number | undefined {
  const value = vscode.workspace
    .getConfiguration("flightPlan")
    .get<number>("serverPort")
  return typeof value === "number" && value > 0 ? value : undefined
}

/** Starts the server, replacing any instance already running. */
export async function startServer(
  context: vscode.ExtensionContext,
): Promise<string | null> {
  stopServer()

  // Before it is run: an upgrade must not keep running the previous server.
  await refreshServer(context).catch(() => false)

  const { serverFile } = locations(context)
  const token = await sessionToken(context)
  const requested =
    configuredPort() ?? context.globalState.get<number>(PORT_KEY) ?? 0

  // `process.execPath` rather than a resolved `node`: on a remote it is the VS
  // Code server's own node binary, which certainly exists on the machine the
  // extension is running on. On a desktop it is Electron, which runs plain node
  // when told to. Either way nothing depends on a PATH.
  const child = spawn(process.execPath, [serverFile], {
    env: {
      ...process.env,
      FLIGHTPLAN_HTTP_PORT: String(requested),
      FLIGHTPLAN_TOKEN: token,
      ELECTRON_RUN_AS_NODE: "1",
    },
      /*
       * stdin is a pipe because the extension sends the adapter down it.
       *
       * It was `"ignore"`, which makes `child.stdin` null — so every line
       * written to it was silently discarded (then answers to the server's
       * questions, which each ran to its timeout). Nothing caught it: the extension-host tests
       * inject the providers directly and never exercise the channel, so the
       * one failure mode nobody could see was the channel itself.
       */
      stdio: ["pipe", "pipe", "pipe"],
  })

  child.stderr?.on("data", (chunk: Buffer) => {
    console.error(`[flightplan server] ${chunk.toString("utf8").trimEnd()}`)
  })

  let port: number
  try {
    port = await firstReadyLine(child)
  } catch (cause) {
    child.kill()
    const message = cause instanceof Error ? cause.message : String(cause)
    lastError =
      requested === 0
        ? message
        : `${message} Port ${requested} may already be in use.`
    throw cause
  }

  lastError = null
  running = { child, port, token }
  watchControl(child, {
    open: (request) => onOpen?.(request),
    completed: (id) => onCompleted?.(id),
  })
  await resendGitAdapter()
  await context.globalState.update(PORT_KEY, port)

  // A dead server must not leave a URL behind that answers nothing.
  child.once("exit", () => {
    if (running?.child === child) running = null
  })

  return serverUrl()
}

export function stopServer(): void {
  running?.child.kill()
  running = null
}
