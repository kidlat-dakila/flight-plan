import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { typescriptImportGraph } from ".."
import { graphCandidates, repoGraph, type RepoGraph } from "../repoGraph"
import { moduleResolver } from "../resolve"

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..", "..", "..", "..", "..", "..")
const fixtures = JSON.parse(readFileSync(join(here, "..", "..", "..", "__tests__", "golden", "resolution.json"), "utf8")) as {
  id: string
  files: Record<string, string>
}[]

/** Every import in the graph whose file differs from what `moduleResolver` gives. */
async function disagreements(graph: RepoGraph, files: ReadonlySet<string>, read: (file: string) => Promise<string | null>): Promise<string[]> {
  const resolve = moduleResolver(files, read)
  const out: string[] = []
  for (const [from, edges] of graph.imports) {
    for (const edge of edges) {
      const ours = await resolve(from, edge.specifier)
      if (ours !== edge.to) out.push(`${from}: ${edge.specifier} graph=${String(edge.to)} resolver=${String(ours)}`)
    }
  }
  return out
}

/** Every file our own specifier reader finds imported, missing from the graph. */
async function missing(graph: RepoGraph, files: ReadonlySet<string>, read: (file: string) => Promise<string | null>): Promise<string[]> {
  const ours = typescriptImportGraph({ files, read, resolve: moduleResolver(files, read) }, async () => [])
  const out: string[] = []
  for (const from of graph.imports.keys()) {
    const inGraph = new Set((graph.imports.get(from) ?? []).map((edge) => edge.to))
    for (const imported of await ours.importsOf(from)) if (!inGraph.has(imported.path)) out.push(`${from} -> ${imported.path}`)
  }
  return out
}

/** Every edge must appear under its target in `importers`, and nothing else. */
function inverse(graph: RepoGraph): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const [from, edges] of graph.imports) {
    for (const edge of edges) {
      if (edge.to === null) continue
      const list = out.get(edge.to) ?? []
      if (!list.includes(from)) list.push(from)
      out.set(edge.to, list)
    }
  }
  return out
}

describe("the TypeScript import graph", () => {
  for (const fixture of fixtures) {
    it(`should resolve each import as the module resolver does: ${fixture.id}`, async () => {
      const files = new Set(Object.keys(fixture.files))
      const read = async (file: string): Promise<string | null> => fixture.files[file] ?? null
      const graph = await repoGraph({ files, read })
      expect([...graph.unhandled]).toEqual([])
      expect(await disagreements(graph, files, read)).toEqual([])
      expect(await missing(graph, files, read)).toEqual([])
      expect(graph.importers).toEqual(inverse(graph))
    })
  }

  it("should read a file whose path dependency-cruiser takes for a glob, such as a route folder", async () => {
    const sources: Record<string, string> = {
      "app/(shop)/orders/[orderId]/page.tsx": 'import { Receipt } from "./_components/Receipt"\nexport default function Page() { return Receipt() }',
      "app/(shop)/orders/[orderId]/_components/Receipt.tsx": "export function Receipt() { return null }",
    }
    const files = new Set(Object.keys(sources))
    const graph = await repoGraph({ files, read: async (file) => sources[file] ?? null })
    expect([...graph.imports.keys()].sort()).toEqual([...files].sort())
    expect(graphCandidates(graph, "app/(shop)/orders/[orderId]/_components/Receipt.tsx")).toEqual([
      "app/(shop)/orders/[orderId]/_components/Receipt.tsx",
      "app/(shop)/orders/[orderId]/page.tsx",
    ])
  })

  it("should resolve under a tsconfig that extends a workspace package", async () => {
    const sources: Record<string, string> = {
      "packages/tsconfig/package.json": JSON.stringify({ name: "@acme/tsconfig" }),
      "packages/tsconfig/tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
      "packages/shop/tsconfig.json": JSON.stringify({ extends: "@acme/tsconfig/tsconfig.json", compilerOptions: { paths: { "@/*": ["./*"] } } }),
      "packages/shop/page.tsx": 'import { a } from "./a"\nimport { b } from "@/b"',
      "packages/shop/a.ts": "export const a = 1",
      "packages/shop/b.ts": "export const b = 1",
    }
    const files = new Set(Object.keys(sources))
    const graph = await repoGraph({ files, read: async (file) => sources[file] ?? null })
    expect(graph.imports.get("packages/shop/page.tsx")?.map((edge) => edge.to)).toEqual(["packages/shop/a.ts", "packages/shop/b.ts"])
  })

  it("should resolve each import of this repository as the module resolver does", { timeout: 120_000 }, async () => {
    const { stdout } = await run("git", ["ls-tree", "-r", "--name-only", "-z", "HEAD"], { cwd: root, maxBuffer: 1 << 26 })
    const files = new Set(stdout.split("\0").filter(Boolean))
    const cache = new Map<string, Promise<string | null>>()
    const read = (file: string): Promise<string | null> => {
      let held = cache.get(file)
      if (held === undefined) {
        held = files.has(file)
          ? run("git", ["show", `HEAD:${file}`], { cwd: root, maxBuffer: 1 << 26 }).then(({ stdout: text }) => text, () => null)
          : Promise.resolve(null)
        cache.set(file, held)
      }
      return held
    }
    const graph = await repoGraph({ files, read })
    expect([...graph.unhandled]).toEqual([])
    expect(graph.imports.size).toBeGreaterThan(300)
    expect(await disagreements(graph, files, read)).toEqual([])
    expect(await missing(graph, files, read)).toEqual([])
    expect(graph.importers).toEqual(inverse(graph))
  })
})
