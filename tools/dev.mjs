/*
 * `pnpm dev`: the API in sample mode and the UI's Vite dev server, together
 *. `pnpm dev:api` runs the API alone, for a
 * UI dev server that is already running.
 *
 * The API is bundled with esbuild on every change and restarted; Vite serves
 * the UI with hot reload. Both bind 127.0.0.1 only. Browser mode serves only
 * the samples: no real documents, no checkouts, no forge.
 */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import esbuild from "esbuild"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "dist", "dev-server.mjs")
const API_PORT = Number(process.env.FLIGHTPLAN_DEV_API_PORT ?? "5198")
const UI_PORT = Number(process.env.FLIGHTPLAN_DEV_UI_PORT ?? "5197")
const apiOnly = process.argv.includes("--api-only")

// The server bundle's own dependency-cruiser setup, so the dev bundle resolves
// what the production one does.
const { serverOptions, dependencyCruiserPlugin } = createRequire(import.meta.url)("../esbuild.js")

let child = null

function restart() {
  if (child !== null) child.kill()
  child = spawn(process.execPath, ["--enable-source-maps", OUT], {
    stdio: "inherit",
    env: { ...process.env, FLIGHTPLAN_DEV_API_PORT: String(API_PORT) },
  })
}

const context = await esbuild.context({
  entryPoints: [path.join(ROOT, "src/api/dev.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: true,
  outfile: OUT,
  // The same field order as the production server bundle (esbuild.js).
  mainFields: ["module", "main"],
  logLevel: "warning",
  ...serverOptions,
  plugins: [
    dependencyCruiserPlugin,
    {
      name: "restart-dev-api",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) restart()
        })
      },
    },
  ],
})
await context.watch()

if (!apiOnly) {
  const { createServer } = await import("vite")
  const vite = await createServer({
    configFile: path.join(ROOT, "src/ui/vite.config.ts"),
    server: { host: "127.0.0.1", port: UI_PORT, strictPort: true },
  })
  await vite.listen()
  vite.printUrls()
}

const stop = async () => {
  child?.kill()
  await context.dispose()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
