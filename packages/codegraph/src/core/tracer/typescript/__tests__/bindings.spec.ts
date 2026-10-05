import { describe, expect, it } from "vitest"
import { exportBindingsOf, importBindingsOf } from "@/core/tracer/typescript/bindings"
import { parse } from "@/core/tracer/typescript/estree"

async function imports(source: string) {
  const tree = parse("sample.ts", source)
  if (tree === null) throw new Error("did not parse")
  return await Promise.resolve(importBindingsOf(tree))
}

async function exportsOf(source: string) {
  const tree = parse("sample.ts", source)
  if (tree === null) throw new Error("did not parse")
  return await Promise.resolve(exportBindingsOf(tree))
}

describe("import bindings", () => {
  it("reads a named import", async () => {
    expect(await imports("import { priceOf } from \"./pricing\"")).toStrictEqual([
      { local: "priceOf", imported: "priceOf", kind: "named", specifier: "./pricing", typeOnly: false, line: 1 },
    ])
  })

  it("reads an aliased named import", async () => {
    expect(await imports("import { priceOf as p } from \"./pricing\"")).toMatchObject([
      { local: "p", imported: "priceOf", kind: "named" },
    ])
  })

  it("reads a default import", async () => {
    expect(await imports("import price from \"./pricing\"")).toMatchObject([
      { local: "price", imported: "default", kind: "default" },
    ])
  })

  it("reads a namespace import", async () => {
    expect(await imports("import * as pricing from \"./pricing\"")).toMatchObject([
      { local: "pricing", imported: "*", kind: "namespace" },
    ])
  })

  it("marks a wholly type-only import", async () => {
    expect(await imports("import type { Money } from \"./types\"")).toMatchObject([
      { local: "Money", typeOnly: true },
    ])
  })

  it("marks only the inline type specifier in a mixed import", async () => {
    expect(await imports("import { type Money, zero } from \"./types\"")).toMatchObject([
      { local: "Money", typeOnly: true },
      { local: "zero", typeOnly: false },
    ])
  })

  it("ignores a side-effect import with no clause", async () => {
    expect(await imports("import \"./setup\"")).toStrictEqual([])
  })
})

describe("export bindings", () => {
  it("reads an exported declaration as a local export", async () => {
    expect(await exportsOf("export const zero = 0")).toStrictEqual([
      { kind: "local", exported: "zero", local: "zero" },
    ])
  })

  it("reads an exported function declaration", async () => {
    expect(await exportsOf("export function priceOf() {}")).toStrictEqual([
      { kind: "local", exported: "priceOf", local: "priceOf" },
    ])
  })

  it("reads a re-export with rename", async () => {
    expect(await exportsOf("export { priceOf as price } from \"./pricing\"")).toStrictEqual([
      { kind: "re-export", exported: "price", imported: "priceOf", specifier: "./pricing" },
    ])
  })

  it("reads a star re-export", async () => {
    expect(await exportsOf("export * from \"./pricing\"")).toStrictEqual([
      { kind: "star", specifier: "./pricing" },
    ])
  })

  it("reads a local re-export clause with no source", async () => {
    expect(await exportsOf("const a = 1\nexport { a as b }")).toStrictEqual([
      { kind: "local", exported: "b", local: "a" },
    ])
  })

  it("reads a default export naming a local", async () => {
    expect(await exportsOf("function priceOf() {}\nexport default priceOf")).toStrictEqual([
      { kind: "default", local: "priceOf" },
    ])
  })
})
