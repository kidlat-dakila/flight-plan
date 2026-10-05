import { describe, expect, it } from "vitest"
import { refFor, typescriptResolver } from "@/core/tracer/typescript/call-graph"
import { childrenFinder } from "@/core/tracer/typescript/children"
import { declarationsIn } from "@/core/tracer/typescript/declarations"
import { parse } from "@/core/tracer/typescript/estree"
import { moduleResolver } from "@/core/tracer/typescript/resolve"
import type { DiagramNode } from "@/core/types"

async function childrenOf(files: Record<string, string>, file: string, name: string, depth?: number): Promise<unknown[]> {
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => await Promise.resolve(files[one] ?? null)
  const resolver = typescriptResolver({ files: names, read, resolve: moduleResolver(names, read) })
  const tree = parse(file, files[file] ?? "")
  const local = tree === null ? undefined : declarationsIn(tree).find((one) => one.name === name)
  if (local === undefined) throw new Error(`no declaration ${name} in ${file}`)
  const shape = (node: DiagramNode): unknown =>
    node.children === undefined ? `${node.code.file}#${node.code.name}` : { [`${node.code.file}#${node.code.name}`]: node.children.map(shape) }
  return (await childrenFinder(resolver)(refFor(file, local), depth)).map(shape)
}

describe("what a changed declaration calls or renders", () => {
  it("follows a named, a default and a namespace import to the declaring file, not a package", async () => {
    const found = await childrenOf(
      {
        "src/pricing.ts": "export function priceOf() { return 1 }\nexport function taxOf() { return 2 }",
        "src/format.ts": "export default function format() { return '' }",
        "src/checkout.ts": [
          "import { priceOf } from \"./pricing\"",
          "import * as pricing from \"./pricing\"",
          "import show from \"./format\"",
          "import { useState } from \"react\"",
          "export function checkout() { useState(); show(); pricing.taxOf(); return priceOf() }",
        ].join("\n"),
      },
      "src/checkout.ts",
      "checkout",
    )
    expect(found).toStrictEqual(["src/format.ts#format", "src/pricing.ts#taxOf", "src/pricing.ts#priceOf"])
  })

  it("follows a barrel to the file that declares the function", async () => {
    const found = await childrenOf(
      {
        "src/pricing/priceOf.ts": "export function priceOf() { return 1 }",
        "src/pricing/index.ts": "export * from \"./priceOf\"",
        "src/checkout.ts": "import { priceOf } from \"./pricing\"\nexport function checkout() { return priceOf() }",
      },
      "src/checkout.ts",
      "checkout",
    )
    expect(found).toStrictEqual(["src/pricing/priceOf.ts#priceOf"])
  })

  it("takes a component element, not a host element", async () => {
    const found = await childrenOf(
      {
        "src/Button.tsx": "export function Button() { return <button /> }",
        "src/Page.tsx": "import { Button } from \"./Button\"\nexport function Page() { return <div><Button /></div> }",
      },
      "src/Page.tsx",
      "Page",
    )
    expect(found).toStrictEqual(["src/Button.tsx#Button"])
  })

  it("leaves out a parameter or local with the import's name, and a nested helper", async () => {
    const found = await childrenOf(
      {
        "src/pricing.ts": "export function priceOf() { return 1 }",
        "src/checkout.ts": [
          "import { priceOf } from \"./pricing\"",
          "function total() { return 0 }",
          "export function checkout(priceOf: () => number) {",
          "  function helper() { return 2 }",
          "  return priceOf() + helper() + total()",
          "}",
        ].join("\n"),
      },
      "src/checkout.ts",
      "checkout",
    )
    expect(found).toStrictEqual(["src/checkout.ts#total"])
  })

  it("goes one level down by default, deeper on request, and never back up the way", async () => {
    const files = {
      "src/a.ts": "import { b } from \"./b\"\nexport function a() { return b() }",
      "src/b.ts": "import { a } from \"./a\"\nimport { c } from \"./c\"\nexport function b() { return a() + c() }",
      "src/c.ts": "import { d } from \"./d\"\nexport function c() { return d() }",
      "src/d.ts": "export function d() { return 1 }",
    }
    expect(await childrenOf(files, "src/a.ts", "a")).toStrictEqual(["src/b.ts#b"])
    expect(await childrenOf(files, "src/a.ts", "a", 2)).toStrictEqual([{ "src/b.ts#b": ["src/c.ts#c"] }])
    expect(await childrenOf(files, "src/a.ts", "a", 3)).toStrictEqual([{ "src/b.ts#b": [{ "src/c.ts#c": ["src/d.ts#d"] }] }])
  })
})
