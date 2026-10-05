import { describe, expect, it } from "vitest"
import { traceCallers, type CallGraph, type Caller } from "@/core/tracer/caller-tree"
import type { CodeRef, Range } from "@/core/types"

const AT: Range = { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } }

function ref(name: string): CodeRef {
  return { name, file: `${name}.ts`, definedAt: AT, enclosingRange: AT }
}

function graphOf(edges: Record<string, string[]>): CallGraph {
  return {
    callersOf: async (code: CodeRef): Promise<Caller[]> =>
      await Promise.resolve((edges[code.name] ?? []).map((name) => ({ code: ref(name), calledAt: AT }))),
  }
}

describe("who calls this declaration", () => {
  it("finds a direct caller", async () => {
    const tree = await traceCallers(graphOf({ price: ["checkout"] }), ref("price"))
    expect(tree.code.name).toBe("price")
    expect(tree.id).toStrictEqual({ file: "price.ts", line: 1 })
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
    expect(tree.callers).toStrictEqual([])
    expect(tree.calledAt).toBeUndefined()
  })
})

describe("the shape of the tree", () => {
  it("duplicates a shared caller reached two ways (a diamond)", async () => {
    const tree = await traceCallers(
      graphOf({ core: ["left", "right"], left: ["app"], right: ["app"] }),
      ref("core"),
    )
    expect(tree.callers.map((one) => one.code.name)).toStrictEqual(["left", "right"])
    for (const branch of tree.callers) {
      expect(branch.callers[0]).toMatchObject({ code: { name: "app" } })
    }
  })

  it("cuts a call cycle rather than looping", async () => {
    const tree = await traceCallers(graphOf({ alpha: ["bravo"], bravo: ["alpha"] }), ref("alpha"))
    const bravo = tree.callers[0]
    expect(bravo.code.name).toBe("bravo")
    expect(bravo.callers[0]).toMatchObject({ code: { name: "alpha" }, callers: [] })
  })

  it("cuts direct recursion (a self-call)", async () => {
    const tree = await traceCallers(graphOf({ fac: ["fac"] }), ref("fac"))
    expect(tree.callers[0]).toMatchObject({ code: { name: "fac" }, callers: [] })
  })
})
