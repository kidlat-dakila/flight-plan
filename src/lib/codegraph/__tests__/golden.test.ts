import { execFile } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { reviewRepo } from "../../git/reviewRepo"
import type { ChangedFile } from "../buildDiagramTree"
import { buildMultiLanguageDiagram } from "../buildMultiLanguageDiagram"
import { fileSymbols } from "../symbols/declarations"
import { treeCache } from "../tracer/parse"

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const golden = join(here, "golden")
const root = join(here, "..", "..", "..", "..")

type Range = { id: string; base: string; head: string; why: string }
const ranges = JSON.parse(readFileSync(join(golden, "ranges.json"), "utf8")) as Range[]

/** One value-flow pattern: a repository in memory and the line that changed. */
type Pattern = { id: string; why: string; files: Record<string, string>; changed: ChangedFile[] }
const patterns = JSON.parse(readFileSync(join(golden, "patterns.json"), "utf8")) as Pattern[]
/** Module resolution cases: tsconfig paths and extends, workspace packages, probing. */
const resolution = JSON.parse(readFileSync(join(golden, "resolution.json"), "utf8")) as Pattern[]

/**
 * What the code graph gives for one range of this repository's history: the
 * diagram, walked the way `buildReach` walks it, and the symbols of every
 * changed TypeScript file, as the scaffold and document resolution read them.
 */
async function outputOf({ base, head }: Range): Promise<string> {
  for (const ref of [base, head]) {
    await run("git", ["cat-file", "-e", `${ref}^{commit}`], { cwd: root }).catch(() => {
      throw new Error(`Commit ${ref} is missing: the golden test needs the full history of this repository.`)
    })
  }
  const review = await reviewRepo({ root, base, head })
  const trees = treeCache()
  try {
    const diagram = await buildMultiLanguageDiagram({
      base: { ...review.base, trees },
      files: review.files,
      candidates: review.candidates,
      values: true,
    })
    const symbols = []
    for (const { path } of review.files) {
      if (!/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/.test(path)) continue
      const text = await review.base.read(path)
      symbols.push({ file: path, symbols: text === null ? null : await fileSymbols(path, text) })
    }
    return `${JSON.stringify({ base, head, diagram, symbols }, null, 2)}\n`
  } finally {
    await trees.free()
  }
}

/**
 * What the code graph gives for one value-flow pattern. The candidate search
 * is the word scan the tracer tests use: every file that names the target.
 */
async function patternOutputOf({ files, changed }: Pattern): Promise<string> {
  const diagram = await buildMultiLanguageDiagram({
    base: { files: new Set(Object.keys(files)), read: async (path) => files[path] ?? null },
    files: changed,
    candidates: async (target) => {
      const word = new RegExp(`\\b${target.name.split(".").pop() ?? target.name}\\b`)
      return Object.keys(files).filter((path) => word.test(files[path] ?? ""))
    },
    values: true,
  })
  return `${JSON.stringify({ changed, diagram }, null, 2)}\n`
}

/** Writes `out` to the golden file with WRITE_GOLDEN=1, then compares with it. */
function expectGolden(id: string, out: string): void {
  const file = join(golden, `${id}.json`)
  if (process.env.WRITE_GOLDEN) writeFileSync(file, out)
  expect(out).toBe(readFileSync(file, "utf8"))
}

/**
 * The code graph's output on fixed ranges of this repository's history, and
 * on the value-flow patterns of `tracer/typescript/__tests__/valueFlow.test.ts`
 * (copied into `golden/patterns.json`, the history has almost none), and on
 * module resolution cases (`golden/resolution.json`: the history has no
 * tsconfig alias and no workspace package), must not change. The files under `golden/` were recorded with the tree-sitter
 * walk, before the TypeScript side moved to acorn; they change only on
 * purpose:
 *   WRITE_GOLDEN=1 npx vitest run src/lib/codegraph/__tests__/golden.test.ts
 */
describe("the code graph on this repository's history", () => {
  for (const range of ranges) {
    it(`should give the recorded output for ${range.id} (${range.why})`, { timeout: 180_000 }, async () => {
      expectGolden(range.id, await outputOf(range))
    })
  }
})

describe("the code graph on the value-flow patterns", () => {
  for (const pattern of patterns) {
    it(`should give the recorded output for ${pattern.id} (${pattern.why})`, async () => {
      expectGolden(pattern.id, await patternOutputOf(pattern))
    })
  }
})

describe("the code graph across module resolution", () => {
  for (const pattern of resolution) {
    it(`should give the recorded output for ${pattern.id} (${pattern.why})`, async () => {
      expectGolden(pattern.id, await patternOutputOf(pattern))
    })
  }
})
