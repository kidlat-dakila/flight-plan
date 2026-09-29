import { describe, expect, it } from "vitest"
import { traceCallers, type CallGraph, type Caller } from "../callerTree"
import type { CodeRef, Range } from "../../types"

const AT: Range = { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } }

/** A declaration whose name is its key, for a compact fixture. */
function ref(name: string): CodeRef {
  return { name, file: `${name}.ts`, definedAt: AT, enclosingRange: AT }
}

/** A call graph from a name → its callers' names. */
function graphOf(edges: Record<string, string[]>): CallGraph {
  return {
    callersOf: async (code: CodeRef): Promise<Caller[]> =>
      (edges[code.name] ?? []).map((name) => ({ code: ref(name), calledAt: AT })),
  }
}

describe("who calls this declaration", () => {
  it("finds a direct caller", async () => {
    const tree = await traceCallers(graphOf({ price: ["checkout"] }), ref("price"))
    expect(tree.code.name).toBe("price")
    expect(tree.id).toEqual({ file: "price.ts", line: 1 })
    expect(tree.callers).toHaveLength(1)
    expect(tree.callers[0]).toMatchObject({ code: { name: "checkout" }, calledAt: AT })
  })

  it("climbs a chain to the entry point", async () => {
    const tree = await traceCallers(
      graphOf({ price: ["checkout"], checkout: ["order"] }),
      ref("price"),
    )
    const checkout = tree.callers[0]
    expect(checkout.code.name).toBe("checkout")
    expect(checkout.callers[0]).toMatchObject({ code: { name: "order" }, callers: [] })
  })

  it("leaves a declaration nobody calls a bare root", async () => {
    const tree = await traceCallers(graphOf({}), ref("price"))
    expect(tree.callers).toEqual([])
    expect(tree.calledAt).toBeUndefined()
  })
})

describe("the shape of the tree", () => {
  it("duplicates a shared caller reached two ways (a diamond)", async () => {
    const tree = await traceCallers(
      graphOf({ core: ["left", "right"], left: ["app"], right: ["app"] }),
      ref("core"),
    )
    expect(tree.callers.map((one) => one.code.name)).toEqual(["left", "right"])
    for (const branch of tree.callers) {
      expect(branch.callers[0]).toMatchObject({ code: { name: "app" } })
    }
  })

  it("cuts a call cycle rather than looping", async () => {
    const tree = await traceCallers(graphOf({ alpha: ["bravo"], bravo: ["alpha"] }), ref("alpha"))
    const bravo = tree.callers[0]
    expect(bravo.code.name).toBe("bravo")
    // Climbing bravo finds alpha again; alpha is already on the chain, so it is
    // materialised once more with no callers instead of looping forever.
    expect(bravo.callers[0]).toMatchObject({ code: { name: "alpha" }, callers: [] })
  })

  it("cuts direct recursion (a self-call)", async () => {
    const tree = await traceCallers(graphOf({ fac: ["fac"] }), ref("fac"))
    expect(tree.callers[0]).toMatchObject({ code: { name: "fac" }, callers: [] })
  })
})
