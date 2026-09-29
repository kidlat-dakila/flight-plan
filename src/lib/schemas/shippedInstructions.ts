import * as fs from "node:fs"
import * as path from "node:path"

/**
 * The shipped instruction markdown, read from disk.
 *
 * Two trees under one root, the same two the repository keeps in
 * `src/lib/schemas/`:
 *  - `default_instructions/` — how to write a field; the editable defaults
 *  - `field_descriptions/`   — what a field is; fixed for every profile
 *
 * The files ship as files. The VSIX carries them in `dist/instructions/`, setup
 * copies them beside the installed server, and each process reads them once.
 * They used to be embedded in the bundles as generated string maps, which meant
 * an edited `.md` did nothing until a generator was run by hand.
 *
 * **The root is set by the process, not found by this module.** The extension
 * is a CommonJS bundle, where `import.meta.url` is empty, so nothing in here can
 * tell where it runs from. Each entry point knows: the server reads the copy
 * beside itself, the extension its own `dist/`, the dev API and the tests the
 * repository's source trees.
 */

export type ShippedInstructions = {
  /** `default_instructions/`, keyed by path relative to it. */
  instructions: Record<string, string>
  /** `field_descriptions/`, keyed by path relative to it. */
  descriptions: Record<string, string>
}

const TREES = { instructions: "default_instructions", descriptions: "field_descriptions" } as const

/** Every `.md` file under a directory, keyed by its path relative to it. */
function readTree(root: string, tree: string): Record<string, string> {
  const base = path.join(root, tree)
  const out: Record<string, string> = {}
  const walk = (dir: string, prefix: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel)
      else if (entry.name.endsWith(".md")) out[rel] = fs.readFileSync(path.join(dir, entry.name), "utf8")
    }
  }
  try {
    walk(base, "")
  } catch (cause) {
    throw new Error(`No shipped instructions at ${base}: ${String(cause)}`)
  }
  // Empty is refused as firmly as missing: an agent served no instructions
  // writes every field wrong, and nothing downstream would say why.
  if (Object.keys(out).length === 0) {
    throw new Error(`No shipped instructions at ${base}: the directory holds no .md files.`)
  }
  return out
}

/** Reads both trees under `root`. Throws, naming the path, when either is missing or empty. */
export function readShippedInstructions(root: string): ShippedInstructions {
  return {
    instructions: readTree(root, TREES.instructions),
    descriptions: readTree(root, TREES.descriptions),
  }
}

/**
 * Replaces the trees under `to` with the ones under `from`.
 *
 * Replaced rather than merged, so a file this version withdrew does not linger
 * beside the server and keep being served. Checked first, so a broken package
 * fails here, at install, rather than leaving an empty copy for the server to
 * trip over later.
 */
export function copyShippedInstructions(from: string, to: string): void {
  readShippedInstructions(from)
  for (const tree of Object.values(TREES)) {
    const target = path.join(to, tree)
    fs.rmSync(target, { recursive: true, force: true })
    fs.cpSync(path.join(from, tree), target, { recursive: true })
  }
}

let loaded: ShippedInstructions | null = null

/**
 * Points this process at its instruction root and reads it.
 *
 * Read at once rather than on first use, so a missing tree stops the process
 * as it starts instead of failing the first agent call that needs a field.
 */
export function setInstructionRoot(next: string): ShippedInstructions {
  loaded = readShippedInstructions(next)
  return loaded
}

/** The instructions this process was pointed at. Throws when no entry point set a root. */
export function shippedInstructions(): ShippedInstructions {
  if (loaded === null) {
    throw new Error(
      "The instruction root was never set. The process's entry point must call setInstructionRoot() before anything reads an instruction.",
    )
  }
  return loaded
}
