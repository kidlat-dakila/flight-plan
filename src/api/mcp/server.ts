import * as crypto from "node:crypto"
import { SERVER_VERSION, errorFields, flushLog, log, logFile, openLog, redactPath } from "../utils/log"
import * as http from "node:http"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { listenToExtension } from "./channel"
import { createServer } from "./tools"
import type { Backend } from "../api/backend"
import { createInstalledBackend } from "../api/installed"
import { handleApi } from "../api/routes"
import { createSampleBackend } from "../api/sample"
import { fileStore } from "../utils/reviewed/store"
import { setInstructionRoot } from "../../lib/schemas/shippedInstructions"

/**
 * The Flight Plan MCP server: one process, run by the VS Code extension, that
 * every agent connects to over loopback HTTP.
 *
 * The extension owns the lifecycle. That is the point: one server instead of one
 * per agent, so there are no two copies writing the same files, one place the
 * configuration is read, and a live process the extension can talk to. It also
 * means an agent's registration is a URL rather than a program to run, so nothing
 * has to resolve a node binary on the agent's side, which is the part that rots
 * when a workspace image is rebuilt.
 *
 * Verified to be reachable by both target agents. Claude Code takes
 * `{"type": "http", "url": …}`, as its own bundled `gitlab`, `linear` and
 * `github` plugins do. Codex's `RawMcpServerConfig` accepts `url`,
 * `bearer_token` and `http_headers` beside `command`, and its binary carries
 * `rmcp::transport::streamable_http_client`.
 *
 * The cost, which is real: nothing works while VS Code is closed.
 */

/**
 * Loopback only, always.
 *
 * These tools write files. Binding anything else would put that on the network,
 * and on a shared workspace that is somebody else's machine too.
 */
const HOST = "127.0.0.1"

/**
 * The token is a path segment rather than a header.
 *
 * Any MCP client that accepts a URL can then reach it, including ones with
 * nowhere to put a header. It is not a substitute for the loopback bind: it
 * stops another process on the same machine driving these tools by guessing the
 * port, which matters because a port on a remote may also be forwarded.
 */
function requestPath(token: string): string {
  return `/mcp/${token}`
}

/** Reads a JSON body, so an initialize can be recognised before routing. */
function readBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on("data", (chunk: Buffer) => chunks.push(chunk))
    request.on("error", reject)
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8")
      if (raw === "") {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(undefined)
      }
    })
  })
}

/**
 * Serves several agents at once, one session each.
 *
 * Sessions rather than the SDK's stateless mode, which wants a fresh transport
 * and server per request and cannot carry a notification belonging to an earlier
 * one: `notifications/initialized` fails with a 500. The whole point of the
 * extension owning the server is that Claude Code and Codex can both be talking
 * to it, so the transport has to keep them apart.
 */
export async function serveHttp(
  port: number,
  token: string | null,
  /**
   * Whether to write the ready line to stdout.
   *
   * False under test, where stdout is the test runner's and the line is a
   * control message meant only for the extension that spawned this process.
   */
  announce = true,
  /**
   * The HTTP API's data, or null for no `/api/` routes.
   *
   * `token` null is the other half of sample mode (`pnpm dev`): no MCP route
   * at all, since nothing there may write.
   */
  api: Backend | null = null,
): Promise<{ port: number; close: () => Promise<void> }> {
  const sessions = new Map<string, StreamableHTTPServerTransport>()
  const expected = token === null ? null : requestPath(token)

  const listener = http.createServer((request, response) => {
    /*
     * One line per request worth reading: every write, every failure, and
     * anything slow. Not the successful reads — an open panel polls every
     * second, and a log of those would bury the rest.
     */
    const began = Date.now()
    response.once("finish", () => {
      const ms = Date.now() - began
      const method = request.method ?? "GET"
      const status = response.statusCode
      if (method === "GET" && status < 400 && ms < 1000) return
      log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "http", {
        method,
        path: redactPath(request.url ?? ""),
        status,
        ms,
      })
    })
    void (async () => {
      if (api !== null && (await handleApi(api, request, response))) return
      if (expected === null || (request.url ?? "").split("?")[0] !== expected) {
        response.writeHead(404).end()
        return
      }

      const body = await readBody(request)
      const header = request.headers["mcp-session-id"]
      const sessionId = Array.isArray(header) ? header[0] : header
      let transport = sessionId === undefined ? undefined : sessions.get(sessionId)

      if (transport === undefined) {
        if (!isInitializeRequest(body)) {
          /*
           * Two different failures, and the status code is what tells them
           * apart to a client that cannot read prose.
           *
           * A session id we do not know is a **404**, which the protocol
           * defines as "start a new session": a client that sees it re-sends
           * `initialize` and carries on. That path is not hypothetical, it is
           * the normal case — this server's sessions live in memory, so every
           * extension upgrade or window reload replaces the process and
           * invalidates every session while the agents are still running and
           * still holding their ids. Answering 400 instead left them wedged
           * until somebody restarted them by hand, with an error message
           * addressed to a human who was not looking.
           *
           * No session id at all is a **400**: the request is simply
           * malformed, and there is nothing for the client to recover to.
           */
          const unknownSession = sessionId !== undefined
          response
            .writeHead(unknownSession ? 404 : 400, {
              "content-type": "application/json",
            })
            .end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: {
                  code: -32000,
                  message: unknownSession
                    ? "Session not found. The server restarted; send initialize to start a new one."
                    : "No session. Send initialize first.",
                },
                id: null,
              }),
            )
          return
        }
        // Annotated, because the callback below refers to `created` inside its
        // own initializer and inference cannot see through that.
        const created: StreamableHTTPServerTransport =
          new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (id: string) => {
              sessions.set(id, created)
            },
          })
        // A disconnected agent must not leave its session behind, or a long VS
        // Code session accumulates one per restart of every agent.
        created.onclose = () => {
          const id = created.sessionId
          if (id !== undefined) sessions.delete(id)
        }
        await createServer().connect(created)
        transport = created
      }

      await transport.handleRequest(request, response, body)
    })().catch((cause: unknown) => {
      log("error", "http.unhandled", { path: redactPath(request.url ?? ""), ...errorFields(cause) })
      if (!response.headersSent) response.writeHead(500).end()
    })
  })

  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject)
    listener.listen(port, HOST, resolve)
  })

  const bound = listener.address()
  const actual = typeof bound === "object" && bound !== null ? bound.port : port
  // The extension reads this one line to learn the port, which matters when it
  // asked for 0 and let the system choose.
  if (announce) {
    process.stdout.write(`${JSON.stringify({ ready: { port: actual } })}\n`)
  }
  return {
    port: actual,
    close: () =>
      new Promise<void>((done) => {
        listener.close(() => done())
        // A held request (the `waiting` sample) would otherwise keep it open.
        listener.closeAllConnections()
      }),
  }
}

/**
 * Starts the server from the environment the extension spawned it with.
 *
 * Exported and *not* called here. Importing this module used to start a server
 * and, with no token in the environment, exit the process — so a test could not
 * so much as import it. `start.ts` is the program; this file is a library.
 */
export async function main(): Promise<void> {
  const port = Number(process.env["FLIGHTPLAN_HTTP_PORT"] ?? "0")
  const token = process.env["FLIGHTPLAN_TOKEN"]
  if (token === undefined || token === "") {
    throw new Error("FLIGHTPLAN_TOKEN is required.")
  }
  listenToExtension()
  // The folder the bundled server was copied into; its config and its state
  // sit beside it.
  const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
  openLog(path.join(serverDirectory, "logs", "server.log"))
  logCrashes()
  // Copied beside the server by setup, with the grammars. Read now, so a
  // missing copy stops the server here rather than at the first agent call.
  const instructions = path.join(serverDirectory, "instructions")
  setInstructionRoot(instructions)
  const reviewed = fileStore(path.join(serverDirectory, "state"))
  const api = createInstalledBackend({
    serverDirectory,
    reviewed,
    samples: createSampleBackend({ reviewed }),
  })
  const served = await serveHttp(Number.isFinite(port) ? port : 0, token, true, api)
  log("info", "server.start", { version: SERVER_VERSION, port: served.port, pid: process.pid, node: process.version, log: logFile(), instructions })
}

/**
 * What kills the server, written down before it goes.
 *
 * An uncaught exception still ends the process, as Node would have: after
 * one, its state cannot be trusted. A rejection nobody handled is only logged,
 * because the work that dropped it may be one scaffold among several.
 */
export function logCrashes(): void {
  process.on("uncaughtException", (cause) => {
    log("error", "server.crash", errorFields(cause))
    void flushLog().then(() => process.exit(1))
  })
  process.on("unhandledRejection", (cause) => {
    log("error", "server.unhandledRejection", errorFields(cause))
  })
}
