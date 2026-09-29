#!/usr/bin/env node
/**
 * Builds the extension and installs it in this machine's VS Code, in one
 * command: `pnpm install:ext`. `--skip-build` installs the package already
 * built. Afterwards, reload the window (Developer: Reload Window).
 *
 * A remote window needs its own install: Flight Plan is a workspace extension
 * (`extensionKind: ["workspace"]`), so VS Code runs it from the remote's own
 * extension list, which `code --install-extension` here never reaches. There,
 * run the remote VS Code server's `code-server --install-extension <vsix>
 * --force` with the package copied across.
 */
import { spawn } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const { name, version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
const VSIX = path.join(ROOT, `${name}-${version}.vsix`)

const args = process.argv.slice(2)
let build = true
for (const arg of args) {
  if (arg === "--skip-build") build = false
  else fail(`Unknown option ${arg}. The one option is --skip-build.`)
}

function fail(message) {
  console.error(`install: ${message}`)
  process.exit(1)
}

/** Runs a command, streaming its output. */
function run(command, argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd: ROOT, stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${String(code)}`))))
  })
}

try {
  if (build) {
    console.log(`Building ${path.basename(VSIX)}…`)
    await run(path.join(ROOT, "node_modules", ".bin", "vsce"), ["package", "--no-dependencies", "--out", VSIX])
  } else if (!fs.existsSync(VSIX)) {
    fail(`${path.basename(VSIX)} does not exist; run without --skip-build.`)
  }
  console.log("Installing on this machine…")
  await run("code", ["--install-extension", VSIX, "--force"])
  console.log(`Done: ${name} ${version}. Reload the VS Code window (Developer: Reload Window).`)
} catch (cause) {
  fail(cause instanceof Error ? cause.message : String(cause))
}
