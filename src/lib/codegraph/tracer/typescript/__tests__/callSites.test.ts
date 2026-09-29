import { describe, expect, it } from "vitest"
import { callSitesIn, type CallSite } from "../callSites"
import { parse } from "../estree"
import type { Range } from "../../../types"

const WHOLE: Range = { start: { line: 1, column: 0 }, end: { line: 9999, column: 0 } }

/** The names looked for are module-scope bindings: every sample imports them. */
const IMPORTS = 'import { priceOf } from "./pricing"\nimport * as pricing from "./pricing"\n'

async function sites(source: string, name: string, within: Range = WHOLE): Promise<CallSite[]> {
  const tree = parse("sample.ts", IMPORTS + source)
  if (tree === null) throw new Error("did not parse")
  return callSitesIn(tree, within, name)
}

describe("call sites of a name", () => {
  it("finds a plain call", async () => {
    const found = await sites("function c() { priceOf() }", "priceOf")
    expect(found).toHaveLength(1)
    expect(found[0].receiver).toBeNull()
    expect(found[0].at.start.line).toBe(3)
  })

  it("finds a member call and reports its receiver", async () => {
    const found = await sites("function c() { pricing.priceOf() }", "priceOf")
    expect(found).toMatchObject([{ receiver: "pricing" }])
  })

  it("ignores a bare reference that is not called", async () => {
    expect(await sites("const list = [priceOf]", "priceOf")).toEqual([])
  })

  it("ignores a function passed as a value", async () => {
    expect(await sites("function c() { map(priceOf) }", "priceOf")).toEqual([])
  })

  it("ignores a different name", async () => {
    expect(await sites("function c() { other() }", "priceOf")).toEqual([])
  })

  it("finds every call of the name", async () => {
    const found = await sites("function c() { priceOf(); priceOf() }", "priceOf")
    expect(found).toHaveLength(2)
  })

  it("keeps only calls inside the given range", async () => {
    // `a` calls priceOf on line 3; `b` on line 4. Restrict to line 4 only.
    const source = ["function a() { priceOf() }", "function b() { priceOf() }"].join("\n")
    const lineFour: Range = { start: { line: 4, column: 0 }, end: { line: 4, column: 100 } }
    const found = await sites(source, "priceOf", lineFour)
    expect(found).toHaveLength(1)
    expect(found[0].at.start.line).toBe(4)
  })

  it("ignores a call of a parameter or local that shadows the name", async () => {
    const source = [
      "function a(priceOf: () => number) { priceOf() }",
      "function b() { const priceOf = () => 1; priceOf() }",
      "function c() { priceOf() }",
    ].join("\n")
    const found = await sites(source, "priceOf")
    expect(found.map((site) => site.at.start.line)).toEqual([5])
  })

  it("ignores a member call whose receiver shadows the namespace", async () => {
    const source = "function a(pricing: { priceOf(): void }) { pricing.priceOf() }"
    expect(await sites(source, "priceOf")).toEqual([])
  })

  it("keeps a member call on this, whose member name cannot be resolved", async () => {
    const source = "class A { priceOf() {} run() { this.priceOf() } }"
    expect(await sites(source, "priceOf")).toMatchObject([{ receiver: null }])
  })
})
