import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { serveHttp } from "./mcp/server"
import { createSampleBackend } from "./api/sample"
import { fileStore } from "./utils/reviewed/store"
import { SERVER_VERSION, log, openLog } from "./utils/log"
import { logCrashes } from "./mcp/server"
import { setInstructionRoot } from "../lib/schemas/shippedInstructions"

/**
 * The API in sample mode, for `pnpm dev`.
 *
 * Only the samples: no stored documents, no checkouts, no adapter, no
 * credentials, and no MCP route. Reader state goes to `.flightplan-dev/` at the
 * repository root, so dev data never mixes with an installed extension's
 *. Built to `dist/dev-server.mjs` by `tools/dev.mjs`, which is why the
 * repository root is one folder up from this file's bundle.
 */

/** The dev API's port. The UI's dev server points at it. */
export const DEV_API_PORT = 5198

async function main(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const state = path.resolve(here, "..", ".flightplan-dev")
  // The repository's own trees, so an edited instruction shows on restart.
  setInstructionRoot(path.resolve(here, "..", "src", "lib", "schemas"))
  const port = Number(process.env["FLIGHTPLAN_DEV_API_PORT"] ?? String(DEV_API_PORT))
  const api = createSampleBackend({ reviewed: fileStore(state) })
  const file = openLog(path.join(state, "server.log"))
  logCrashes()
  const server = await serveHttp(port, null, false, api)
  log("info", "server.start", { version: SERVER_VERSION, port: server.port, pid: process.pid, mode: "samples", log: file })
  process.stdout.write(`Flight Plan dev API (samples only) on http://127.0.0.1:${String(server.port)}/api/\n`)
}

main().catch((cause: unknown) => {
  process.stderr.write(`The dev API did not start: ${String(cause)}\n`)
  process.exit(1)
})
