import { describe, expect, it } from "vitest"
import { traceCallers } from "../../callerTree"
import type { DiagramNode } from "../../../types"
import { refFor, typescriptCallGraph, type CallCandidates } from "../callGraph"
import { declarationsIn } from "../declarations"
import { parse } from "../estree"
import { moduleResolver } from "../resolve"

/**
 * Trace who calls `targetName` in `targetFile`, over a literal repo.
 *
 * `candidates` is the dumb name filter the real `git grep` stands in for: every
 * file whose text writes the name as a word. Resolving each candidate for real
 * is what makes an edge sound — the point of every test below.
 */
async function trace(
  files: Record<string, string>,
  targetFile: string,
  targetName: string,
): Promise<DiagramNode> {
  const candidates: CallCandidates = async (target) => {
    const name = target.name.split(".").pop() ?? target.name
    const word = new RegExp(`\\b${name}\\b`)
    return Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path)
  }
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => files[one] ?? null
  const graph = typescriptCallGraph({ files: names, read, resolve: moduleResolver(names, read) }, candidates)

  const tree = parse(targetFile, files[targetFile] ?? "")
  if (tree === null) throw new Error("target did not parse")
  const local = declarationsIn(tree).find(
    (one) => one.name === targetName || one.name.endsWith(`.${targetName}`),
  )
  if (local === undefined) throw new Error(`no declaration ${targetName} in ${targetFile}`)
  return traceCallers(graph, refFor(targetFile, local))
}

const PRICING = "export function priceOf() { return 1 }"
const callers = (node: DiagramNode): string[] => node.callers.map((one) => one.code.name)

describe("who calls this function", () => {
  it("finds a direct caller and where it calls", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import { priceOf } from "./pricing"',
          "export function checkout() { return priceOf() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(tree.code.name).toBe("priceOf")
    expect(tree.callers).toHaveLength(1)
    expect(tree.callers[0].code).toMatchObject({ name: "checkout", file: "src/checkout.ts" })
    expect(tree.callers[0].calledAt?.start.line).toBe(2)
  })

  it("climbs a chain to the entry point", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import { priceOf } from "./pricing"',
          "export function checkout() { return priceOf() }",
        ].join("\n"),
        "src/order.ts": [
          'import { checkout } from "./checkout"',
          "export function order() { return checkout() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(tree.callers[0].code.name).toBe("checkout")
    expect(tree.callers[0].callers[0]).toMatchObject({ code: { name: "order" }, callers: [] })
  })

  it("returns no callers for a function nobody calls", async () => {
    const tree = await trace(
      { "src/pricing.ts": PRICING, "src/other.ts": "export function other() { return 1 }" },
      "src/pricing.ts",
      "priceOf",
    )
    expect(tree.callers).toEqual([])
  })

  it("finds a caller in the same file, needing no import", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": [PRICING, "export function total() { return priceOf() + 1 }"].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["total"])
  })
})

describe("resolving the call to the target", () => {
  it("follows an aliased import", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import { priceOf as p } from "./pricing"',
          "export function checkout() { return p() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["checkout"])
  })

  it("follows a namespace member call", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import * as pricing from "./pricing"',
          "export function checkout() { return pricing.priceOf() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["checkout"])
  })

  it("climbs through a re-export barrel", async () => {
    const tree = await trace(
      {
        "lib/pricing.ts": PRICING,
        "lib/index.ts": 'export { priceOf } from "./pricing"',
        "app.ts": ['import { priceOf } from "./lib"', "export function app() { return priceOf() }"].join(
          "\n",
        ),
      },
      "lib/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["app"])
  })

  it("climbs through an export * barrel", async () => {
    const tree = await trace(
      {
        "lib/pricing.ts": PRICING,
        "lib/index.ts": 'export * from "./pricing"',
        "app.ts": ['import { priceOf } from "./lib"', "export function app() { return priceOf() }"].join(
          "\n",
        ),
      },
      "lib/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["app"])
  })

  it("climbs through two layers of re-export barrels", async () => {
    // app → pkg/index (export *) → pkg/inner/index (export { … } from) → pricing.
    // Neither barrel names or calls priceOf; only exportReaches recursion ties
    // the local `priceOf` in app back to the target two hops away.
    const tree = await trace(
      {
        "pkg/pricing.ts": PRICING,
        "pkg/inner/index.ts": 'export { priceOf } from "../pricing"',
        "pkg/index.ts": 'export * from "./inner"',
        "app.ts": ['import { priceOf } from "./pkg"', "export function app() { return priceOf() }"].join(
          "\n",
        ),
      },
      "pkg/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["app"])
  })

  it("resolves a tsconfig paths alias", async () => {
    const tree = await trace(
      {
        "src/tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }),
        "src/lib/pricing.ts": PRICING,
        "src/app.ts": [
          'import { priceOf } from "@/lib/pricing"',
          "export function app() { return priceOf() }",
        ].join("\n"),
      },
      "src/lib/pricing.ts",
      "priceOf",
    )
    expect(callers(tree)).toEqual(["app"])
  })

  it("does not count a function passed as a value", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import { priceOf } from "./pricing"',
          "export function checkout() { return [priceOf] }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(tree.callers).toEqual([])
  })

  it("ignores a caller that imports the name only as a type", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          'import type { priceOf } from "./pricing"',
          "export function checkout() { const x: typeof priceOf = null as any; return x }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(tree.callers).toEqual([])
  })
})

describe("the shape of the tree", () => {
  it("does not make a recursive function its own caller", async () => {
    const tree = await trace(
      { "src/f.ts": "export function fac(n) { return n * fac(n - 1) }" },
      "src/f.ts",
      "fac",
    )
    expect(tree.callers).toEqual([])
  })

  it("cuts a mutual call cycle", async () => {
    const tree = await trace(
      {
        "src/a.ts": [
          'import { b } from "./b"',
          "export function a() { return b() }",
        ].join("\n"),
        "src/b.ts": [
          'import { a } from "./a"',
          "export function b() { return a() }",
        ].join("\n"),
      },
      "src/a.ts",
      "a",
    )
    const b = tree.callers[0]
    expect(b.code.name).toBe("b")
    expect(b.callers[0]).toMatchObject({ code: { name: "a" }, callers: [] })
  })

  it("duplicates a caller reached two ways (a diamond)", async () => {
    const tree = await trace(
      {
        "src/core.ts": "export function core() { return 1 }",
        "src/left.ts": ['import { core } from "./core"', "export function left() { return core() }"].join(
          "\n",
        ),
        "src/right.ts": ['import { core } from "./core"', "export function right() { return core() }"].join(
          "\n",
        ),
        "src/app.ts": [
          'import { left } from "./left"',
          'import { right } from "./right"',
          "export function app() { return left() + right() }",
        ].join("\n"),
      },
      "src/core.ts",
      "core",
    )
    expect(callers(tree).sort()).toEqual(["left", "right"])
    for (const branch of tree.callers) {
      expect(branch.callers[0]).toMatchObject({ code: { name: "app" } })
    }
  })
})
