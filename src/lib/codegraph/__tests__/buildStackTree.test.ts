import { describe, expect, it } from "vitest"
import { buildStackTree } from "../buildStackTree"
import type { CallGraph, Caller } from "../tracer/callerTree"
import type { CodeRef, Range } from "../types"

const at = (from: number, to: number): Range => ({
  start: { line: from, column: 0 },
  end: { line: to, column: 0 },
})

/** A declaration spanning lines [from, to] in the changed file. */
const ref = (name: string, from: number, to: number, file = "changed.ts"): CodeRef => ({
  name,
  file,
  definedAt: at(from, from),
  enclosingRange: at(from, to),
})

/** A call graph from name → caller names. */
function graphOf(edges: Record<string, string[]>): CallGraph {
  return {
    callersOf: async (code: CodeRef): Promise<Caller[]> =>
      (edges[code.name] ?? []).map((name) => ({ code: ref(name, 1, 1, `${name}.ts`), calledAt: at(1, 1) })),
  }
}

describe("buildStackTree", () => {
  it("roots only at declarations the diff touched", async () => {
    const changed = [ref("a", 1, 5), ref("b", 10, 20)]
    // The diff touches line 12 — inside b, not a.
    const diagram = await buildStackTree({ graph: graphOf({}), changed, locDiff: [[12, 12]] })
    expect(diagram.map((one) => one.code.name)).toEqual(["b"])
  })

  it("climbs each root's callers", async () => {
    const changed = [ref("a", 1, 5)]
    const diagram = await buildStackTree({
      graph: graphOf({ a: ["caller"] }),
      changed,
      locDiff: [[2, 2]],
    })
    expect(diagram[0].callers[0]).toMatchObject({ code: { name: "caller" } })
  })

  it("is empty when the diff touches no declaration", async () => {
    const changed = [ref("a", 1, 5)]
    const diagram = await buildStackTree({ graph: graphOf({}), changed, locDiff: [[100, 100]] })
    expect(diagram).toEqual([])
  })
})
