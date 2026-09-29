import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import { createRequire } from "node:module"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { afterAll, describe, expect, it } from "vitest"

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "..", "..", "..", "..")
const require = createRequire(import.meta.url)
const esbuild = require("esbuild") as typeof import("esbuild")
const { shared, serverOptions, dependencyCruiserPlugin } = require(path.join(root, "esbuild.js")) as {
  shared: import("esbuild").BuildOptions
  serverOptions: import("esbuild").BuildOptions
  dependencyCruiserPlugin: import("esbuild").Plugin
}

const made: string[] = []
afterAll(async () => {
  await Promise.all(made.map((one) => fs.rm(one, { recursive: true, force: true })))
})

/**
 * The code graph inside the server's one-file bundle. The tests run the
 * sources with node_modules at hand; the installed server has none beside it,
 * so a compiler or reporter that dependency-cruiser loads by name at run time
 * only fails here.
 */
describe("the code graph, bundled as the server is", () => {
  it("should build this repository's import graph with nothing beside the bundle", { timeout: 180_000 }, async () => {
    const alone = await fs.mkdtemp(path.join(os.tmpdir(), "fp-bundle-"))
    made.push(alone)
    const outfile = path.join(alone, "graph.mjs")
    await esbuild.build({
      ...shared,
      ...serverOptions,
      entryPoints: [path.join(here, "bundle", "graphEntry.ts")],
      format: "esm",
      outfile,
      sourcemap: false,
      plugins: [dependencyCruiserPlugin],
    })
    expect(await fs.readdir(alone)).toEqual(["graph.mjs"])
    const { stdout } = await run(process.execPath, [outfile, root], { cwd: alone, maxBuffer: 1 << 24 })
    const found = JSON.parse(stdout) as { files: number; edges: number; unhandled: string[] }
    expect(found.unhandled).toEqual([])
    expect(found.files).toBeGreaterThan(300)
    expect(found.edges).toBeGreaterThan(1000)
  })
})
