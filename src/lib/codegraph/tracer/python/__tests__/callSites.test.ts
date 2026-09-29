import { describe, expect, it } from "vitest"
import type { Range } from "../../../types"
import { parseSource } from "../../parse"
import { callSitesIn, type CallSite } from "../callSites"

const WHOLE: Range = { start: { line: 1, column: 0 }, end: { line: 9999, column: 0 } }

async function sites(source: string, name: string, within: Range = WHOLE): Promise<CallSite[]> {
  const tree = await parseSource("sample.py", source)
  if (tree === null) throw new Error("did not parse")
  return callSitesIn(tree, within, name)
}

describe("callSitesIn (python)", () => {
  it("finds a plain call", async () => {
    const found = await sites("def c():\n    price_of()\n", "price_of")
    expect(found).toHaveLength(1)
    expect(found[0].receiver).toBeNull()
    expect(found[0].at.start.line).toBe(2)
  })

  it("finds a method call and reports its receiver", async () => {
    expect(await sites("def c():\n    pricing.price_of()\n", "price_of")).toMatchObject([{ receiver: "pricing" }])
  })

  it("reports self as a receiver", async () => {
    expect(await sites("class S:\n    def c(self):\n        self.price_of()\n", "price_of")).toMatchObject([
      { receiver: "self" },
    ])
  })

  it("reports the full dotted path as the receiver for a chained attribute call", async () => {
    expect(await sites("def c():\n    a.b.price_of()\n", "price_of")).toMatchObject([{ receiver: "a.b" }])
  })

  it("ignores a bare reference that is not called", async () => {
    expect(await sites("items = [price_of]\n", "price_of")).toEqual([])
  })

  it("ignores a function passed as a value", async () => {
    expect(await sites("def c():\n    register(price_of)\n", "price_of")).toEqual([])
  })

  it("restricts to the within range", async () => {
    const src = "def a():\n    price_of()\ndef b():\n    price_of()\n"
    const only = { start: { line: 3, column: 0 }, end: { line: 9999, column: 0 } }
    const found = await sites(src, "price_of", only)
    expect(found).toHaveLength(1)
    expect(found[0].at.start.line).toBe(4)
  })
})
