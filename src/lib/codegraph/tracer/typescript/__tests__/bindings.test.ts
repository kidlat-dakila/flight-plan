import { describe, expect, it } from "vitest"
import { exportBindingsOf, importBindingsOf } from "../bindings"
import { parse } from "../estree"

async function imports(source: string) {
  const tree = parse("sample.ts", source)
  if (tree === null) throw new Error("did not parse")
  return importBindingsOf(tree)
}

async function exports_(source: string) {
  const tree = parse("sample.ts", source)
  if (tree === null) throw new Error("did not parse")
  return exportBindingsOf(tree)
}

describe("import bindings", () => {
  it("reads a named import", async () => {
    expect(await imports('import { priceOf } from "./pricing"')).toEqual([
      { local: "priceOf", imported: "priceOf", kind: "named", specifier: "./pricing", typeOnly: false, line: 1 },
    ])
  })

  it("reads an aliased named import", async () => {
    expect(await imports('import { priceOf as p } from "./pricing"')).toMatchObject([
      { local: "p", imported: "priceOf", kind: "named" },
    ])
  })

  it("reads a default import", async () => {
    expect(await imports('import price from "./pricing"')).toMatchObject([
      { local: "price", imported: "default", kind: "default" },
    ])
  })

  it("reads a namespace import", async () => {
    expect(await imports('import * as pricing from "./pricing"')).toMatchObject([
      { local: "pricing", imported: "*", kind: "namespace" },
    ])
  })

  it("marks a wholly type-only import", async () => {
    expect(await imports('import type { Money } from "./types"')).toMatchObject([
      { local: "Money", typeOnly: true },
    ])
  })

  it("marks only the inline type specifier in a mixed import", async () => {
    expect(await imports('import { type Money, zero } from "./types"')).toMatchObject([
      { local: "Money", typeOnly: true },
      { local: "zero", typeOnly: false },
    ])
  })

  it("ignores a side-effect import with no clause", async () => {
    expect(await imports('import "./setup"')).toEqual([])
  })
})

describe("export bindings", () => {
  it("reads an exported declaration as a local export", async () => {
    expect(await exports_("export const zero = 0")).toEqual([
      { kind: "local", exported: "zero", local: "zero" },
    ])
  })

  it("reads an exported function declaration", async () => {
    expect(await exports_("export function priceOf() {}")).toEqual([
      { kind: "local", exported: "priceOf", local: "priceOf" },
    ])
  })

  it("reads a re-export with rename", async () => {
    expect(await exports_('export { priceOf as price } from "./pricing"')).toEqual([
      { kind: "re-export", exported: "price", imported: "priceOf", specifier: "./pricing" },
    ])
  })

  it("reads a star re-export", async () => {
    expect(await exports_('export * from "./pricing"')).toEqual([
      { kind: "star", specifier: "./pricing" },
    ])
  })

  it("reads a local re-export clause with no source", async () => {
    expect(await exports_("const a = 1\nexport { a as b }")).toEqual([
      { kind: "local", exported: "b", local: "a" },
    ])
  })

  it("reads a default export naming a local", async () => {
    expect(await exports_("function priceOf() {}\nexport default priceOf")).toEqual([
      { kind: "default", local: "priceOf" },
    ])
  })
})
