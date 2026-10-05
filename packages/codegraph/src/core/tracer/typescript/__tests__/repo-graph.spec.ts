import { execFile } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { Memo } from "@/core/memo"
import { mapInSequence } from "@/core/sequence"
import { typescriptImportGraph } from "@/core/tracer/typescript"
import { graphCandidates, repoGraph, type RepoGraph } from "@/core/tracer/typescript/repo-graph"
import { moduleResolver } from "@/core/tracer/typescript/resolve"
import { RESOLUTION_FIXTURES } from "./resolution-fixtures"

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..", "..", "..", "..", "..", "..", "..")

async function disagreements(graph: RepoGraph, files: ReadonlySet<string>, read: (file: string) => Promise<string | null>): Promise<string[]> {
  const resolve = moduleResolver(files, read)
  const uses = [...graph.imports].flatMap(([from, edges]) => edges.map((edge) => ({ from, edge })))
  const compared = await mapInSequence(uses, async ({ from, edge }) => {
    const ours = await resolve(from, edge.specifier)
    return ours === edge.to ? [] : [`${from}: ${edge.specifier} graph=${String(edge.to)} resolver=${String(ours)}`]
  })
  return compared.flat()
}

async function missing(graph: RepoGraph, files: ReadonlySet<string>, read: (file: string) => Promise<string | null>): Promise<string[]> {
  const ours = typescriptImportGraph({ files, read, resolve: moduleResolver(files, read) }, async () => await Promise.resolve([]))
  const compared = await mapInSequence([...graph.imports], async ([from, edges]) => {
    const inGraph = new Set(edges.map((edge) => edge.to))
    const imported = await ours.importsOf(from)
    return imported.filter((one) => !inGraph.has(one.path)).map((one) => `${from} -> ${one.path}`)
  })
  return compared.flat()
}

function inverse(graph: RepoGraph): Map<string, string[]> {
  const uses = [...graph.imports].flatMap(([from, edges]) => edges.flatMap((edge) => (edge.to === null ? [] : [{ to: edge.to, from }])))
  return uses.reduce<Map<string, string[]>>((out, { to, from }) => {
    const list = out.get(to) ?? []
    return list.includes(from) ? out : new Map(out).set(to, [...list, from])
  }, new Map())
}

describe("the TypeScript import graph", () => {
  for (const fixture of RESOLUTION_FIXTURES) {
    it(`should resolve each import as the module resolver does: ${fixture.id}`, async () => {
      const files = new Set(Object.keys(fixture.files))
      const read = async (file: string): Promise<string | null> => await Promise.resolve(fixture.files[file] ?? null)
      const graph = await repoGraph({ files, read })
      expect([...graph.unhandled]).toStrictEqual([])
      expect(await disagreements(graph, files, read)).toStrictEqual([])
      expect(await missing(graph, files, read)).toStrictEqual([])
      expect(graph.importers).toStrictEqual(inverse(graph))
    })
  }

  it("should read a file whose path dependency-cruiser takes for a glob, such as a route folder", async () => {
    const sources: Record<string, string> = {
      "app/(shop)/orders/[orderId]/page.tsx": "import { Receipt } from \"./_components/Receipt\"\nexport default function Page() { return Receipt() }",
      "app/(shop)/orders/[orderId]/_components/Receipt.tsx": "export function Receipt() { return null }",
    }
    const files = new Set(Object.keys(sources))
    const graph = await repoGraph({ files, read: async (file) => await Promise.resolve(sources[file] ?? null) })
    expect([...graph.imports.keys()].sort()).toStrictEqual([...files].sort())
    expect(graphCandidates(graph, "app/(shop)/orders/[orderId]/_components/Receipt.tsx")).toStrictEqual([
      "app/(shop)/orders/[orderId]/_components/Receipt.tsx",
      "app/(shop)/orders/[orderId]/page.tsx",
    ])
  })

  it("should resolve under a tsconfig that extends a workspace package", async () => {
    const sources: Record<string, string> = {
      "packages/tsconfig/package.json": JSON.stringify({ name: "@acme/tsconfig" }),
      "packages/tsconfig/tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
      "packages/shop/tsconfig.json": JSON.stringify({ extends: "@acme/tsconfig/tsconfig.json", compilerOptions: { paths: { "@/*": ["./*"] } } }),
      "packages/shop/page.tsx": "import { a } from \"./a\"\nimport { b } from \"@/b\"",
      "packages/shop/a.ts": "export const a = 1",
      "packages/shop/b.ts": "export const b = 1",
    }
    const files = new Set(Object.keys(sources))
    const graph = await repoGraph({ files, read: async (file) => await Promise.resolve(sources[file] ?? null) })
    expect(graph.imports.get("packages/shop/page.tsx")?.map((edge) => edge.to)).toStrictEqual(["packages/shop/a.ts", "packages/shop/b.ts"])
  })

  it("should resolve each import of this repository as the module resolver does", { timeout: 120_000 }, async () => {
    const { stdout } = await run("git", ["ls-tree", "-r", "--name-only", "-z", "HEAD"], { cwd: root, maxBuffer: 1 << 26 })
    const files = new Set(stdout.split("\0").filter(Boolean))
    const cache = new Memo<string, Promise<string | null>>()
    const read = async (file: string): Promise<string | null> =>
      cache.remember(file, async () =>
        files.has(file)
          ? run("git", ["show", `HEAD:${file}`], { cwd: root, maxBuffer: 1 << 26 }).then(({ stdout: text }) => text, () => null)
          : await Promise.resolve(null),
      )
    const graph = await repoGraph({ files, read })
    expect([...graph.unhandled]).toStrictEqual([])
    expect(graph.imports.size).toBeGreaterThan(300)
    expect(await disagreements(graph, files, read)).toStrictEqual([])
    expect(await missing(graph, files, read)).toStrictEqual([])
    expect(graph.importers).toStrictEqual(inverse(graph))
  })
})
