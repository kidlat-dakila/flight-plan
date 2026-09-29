import { describe, expect, it } from "vitest"
import { traceCallers } from "../callerTree"
import { callGraphFrom, type CallProbe, type CallSearch, type CallSite } from "../callSearch"
import type { CodeRef, Range } from "../../types"

const at = (from: number, to: number): Range => ({
  start: { line: from, column: 0 },
  end: { line: to, column: 0 },
})

const ref = (name: string, from: number, to: number, file = "a.ts"): CodeRef => ({
  name,
  file,
  definedAt: at(from, from),
  enclosingRange: at(from, to),
})

type Cfg = {
  candidates: string[]
  declarations?: Record<string, CodeRef[]>
  localNames?: Record<string, CallSearch[]>
  sites?: Record<string, Record<string, CallSite[]>>
}

function probeOf(cfg: Cfg): CallProbe {
  return {
    candidates: async () => cfg.candidates,
    declarationsOf: async (file) => cfg.declarations?.[file] ?? [],
    localNamesFor: async (file) => cfg.localNames?.[file] ?? [],
    callSitesOf: async (file, name) => cfg.sites?.[file]?.[name] ?? [],
  }
}

const target = ref("price", 1, 3, "p.ts")

describe("callGraphFrom (generic one-level search)", () => {
  it("attributes a call to its enclosing declaration", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("checkout", 1, 5)] },
        localNames: { "a.ts": [{ name: "price", receiver: null }] },
        sites: { "a.ts": { price: [{ at: at(3, 3), receiver: null }] } },
      }),
    )
    const callers = await graph.callersOf(target)
    expect(callers).toHaveLength(1)
    expect(callers[0]).toMatchObject({ code: { name: "checkout" }, calledAt: { start: { line: 3 } } })
  })

  it("attributes to the tightest declaration when they nest", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("outer", 1, 10), ref("inner", 3, 6)] },
        localNames: { "a.ts": [{ name: "price", receiver: null }] },
        sites: { "a.ts": { price: [{ at: at(4, 4), receiver: null }] } },
      }),
    )
    expect((await graph.callersOf(target))[0].code.name).toBe("inner")
  })

  it("honours the receiver a search requires", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("checkout", 1, 5)] },
        localNames: { "a.ts": [{ name: "price", receiver: "ns" }] },
        sites: { "a.ts": { price: [{ at: at(3, 3), receiver: null }] } },
      }),
    )
    expect(await graph.callersOf(target)).toEqual([])
  })

  it("ignores a call outside every declaration", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("checkout", 1, 5)] },
        localNames: { "a.ts": [{ name: "price", receiver: null }] },
        sites: { "a.ts": { price: [{ at: at(99, 99), receiver: null }] } },
      }),
    )
    expect(await graph.callersOf(target)).toEqual([])
  })

  it("does not make the target its own caller", async () => {
    // A recursive call inside price itself: the enclosing decl is the target.
    const graph = callGraphFrom(
      probeOf({
        candidates: ["p.ts"],
        declarations: { "p.ts": [{ ...target }] },
        localNames: { "p.ts": [{ name: "price", receiver: null }] },
        sites: { "p.ts": { price: [{ at: at(2, 2), receiver: null }] } },
      }),
    )
    expect(await graph.callersOf(target)).toEqual([])
  })

  it("dedupes a caller that calls the target twice", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("checkout", 1, 5)] },
        localNames: { "a.ts": [{ name: "price", receiver: null }] },
        sites: { "a.ts": { price: [{ at: at(2, 0), receiver: null }, { at: at(4, 0), receiver: null }] } },
      }),
    )
    const callers = await graph.callersOf(target)
    expect(callers).toHaveLength(1)
    expect(callers[0].calledAt.start.line).toBe(2) // the first site
  })

  it("sorts callers by identity", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["b.ts", "a.ts"],
        declarations: { "a.ts": [ref("alpha", 1, 5, "a.ts")], "b.ts": [ref("bravo", 1, 5, "b.ts")] },
        localNames: { "a.ts": [{ name: "price", receiver: null }], "b.ts": [{ name: "price", receiver: null }] },
        sites: {
          "a.ts": { price: [{ at: at(2, 0), receiver: null }] },
          "b.ts": { price: [{ at: at(2, 0), receiver: null }] },
        },
      }),
    )
    expect((await graph.callersOf(target)).map((one) => one.code.name)).toEqual(["alpha", "bravo"])
  })

  it("plugs into traceCallers to build the inverted tree", async () => {
    const graph = callGraphFrom(
      probeOf({
        candidates: ["a.ts"],
        declarations: { "a.ts": [ref("checkout", 1, 5)] },
        localNames: { "a.ts": [{ name: "price", receiver: null }] },
        sites: { "a.ts": { price: [{ at: at(3, 3), receiver: null }] } },
      }),
    )
    const tree = await traceCallers(graph, target)
    expect(tree.callers[0]).toMatchObject({ code: { name: "checkout" } })
  })
})
