import type { DiagramNode, Range } from "../../codegraph/types"
import { checkBlast } from "../../schemas/diagram/blast"
import { describe, expect, it } from "vitest"
import { buildBlastBoard } from "../buildBlastBoard"

/** A one-line range on `line` in some file, columns unused by the builder. */
const at = (line: number): Range => ({
  start: { line, column: 0 },
  end: { line, column: 0 },
})

/** A whole-body range from `from` to `to`. */
const body = (from: number, to: number): Range => ({
  start: { line: from, column: 0 },
  end: { line: to, column: 0 },
})

/** A codegraph node with sensible defaults. */
function node(
  file: string,
  name: string,
  line: number,
  extra: Partial<DiagramNode> = {},
): DiagramNode {
  return {
    id: { file, line },
    code: { file, name, definedAt: at(line), enclosingRange: body(line, line + 5) },
    callers: [],
    ...extra,
  }
}

const seed = { diff: { base: "a".repeat(40), head: "b".repeat(40) } }

describe("buildBlastBoard", () => {
  it("flattens the caller forest into an inward-pointing board checkBlast accepts", () => {
    // entry E → C1 → R (changed); C2 → R. R is the change.
    const e = node("e.ts", "handleRequest", 10, { calledAt: at(12) })
    const c1 = node("c1.ts", "validateBasket", 20, { calledAt: at(22), callers: [e] })
    const c2 = node("c2.ts", "register", 30, { calledAt: at(32) })
    const r = node("r.ts", "isAdult", 40, { callers: [c1, c2] })

    const board = buildBlastBoard([r], { "r.ts": [{ from: 41, to: 43 }] }, seed)

    // The change is hop 0 and marked; its callers are dependents, one hop out.
    const byId = new Map(board.nodes.map((n) => [n.id, n]))
    expect(board.nodes).toHaveLength(4)
    expect(byId.get("r.ts:40")).toMatchObject({ hop: 0, changed: true, label: "isAdult" })
    expect(byId.get("c1.ts:20")).toMatchObject({ hop: 1, label: "validateBasket" })
    expect(byId.get("c2.ts:30")).toMatchObject({ hop: 1 })
    expect(byId.get("e.ts:10")).toMatchObject({ hop: 2 })
    // A dependent carries no `changed`.
    expect(byId.get("c1.ts:20")?.changed).toBeUndefined()

    // Edges point inward (dependent → what it uses), with the call-site line.
    expect(board.edges).toContainEqual({ from: "c1.ts:20", to: "r.ts:40", kind: "call", at: 22 })
    expect(board.edges).toContainEqual({ from: "c2.ts:30", to: "r.ts:40", kind: "call", at: 32 })
    expect(board.edges).toContainEqual({ from: "e.ts:10", to: "c1.ts:20", kind: "call", at: 12 })

    // The real schema accepts it and finds no problems.
    const checked = checkBlast(board)
    expect(checked.problems).toEqual([])
    expect(checked.blast?.nodes).toHaveLength(4)
  })

  it("draws a callee fork as an inward edge from the shared node", () => {
    // A shared caller S calls two changes, R1 (root) and R2 (a callee fork).
    const r2 = node("r2.ts", "sibling", 60, { calledAt: at(52) })
    const s = node("s.ts", "shared", 50, { calledAt: at(52), callees: [r2] })
    const r1 = node("r1.ts", "changeOne", 70, { callers: [s] })

    const board = buildBlastBoard(
      [r1],
      { "r1.ts": [{ from: 71, to: 72 }], "r2.ts": [{ from: 61, to: 62 }] },
      seed,
    )

    const byId = new Map(board.nodes.map((n) => [n.id, n]))
    expect(byId.get("r1.ts:70")).toMatchObject({ hop: 0, changed: true })
    expect(byId.get("r2.ts:60")).toMatchObject({ hop: 0, changed: true })
    expect(byId.get("s.ts:50")).toMatchObject({ hop: 1 })
    // S depends on both changes: an edge inward to each.
    expect(board.edges).toContainEqual({ from: "s.ts:50", to: "r1.ts:70", kind: "call", at: 52 })
    expect(board.edges).toContainEqual({ from: "s.ts:50", to: "r2.ts:60", kind: "call", at: 52 })

    expect(checkBlast(board).problems).toEqual([])
  })

  it("includes value-handoff reach and turns an escape marker into an unproven node", () => {
    // priceOf is handed off into Child (a value edge) and also escapes at a spread.
    const child = node("Child.tsx", "Child", 3, { via: "value", calledAt: at(4) })
    const marker0: DiagramNode = {
      id: { file: "wire.ts", line: 5 },
      code: {
        file: "wire.ts",
        name: "escapes: spread",
        definedAt: at(5),
        enclosingRange: body(5, 5),
      },
      via: "value",
      escape: { reason: "spread", at: at(5) },
      callers: [],
    }
    const r = node("r.ts", "priceOf", 40, { callers: [child, marker0] })

    const board = buildBlastBoard([r], { "r.ts": [{ from: 41, to: 43 }] }, seed)
    const byId = new Map(board.nodes.map((n) => [n.id, n]))

    // The handoff target is in the reach, one hop out — same as a plain caller.
    expect(byId.get("Child.tsx:3")).toMatchObject({ hop: 1, label: "Child" })

    // The escape becomes an unproven node: the reach may continue past it, and
    // an agent is asked where. It plugs into blast's existing unproven flow.
    const marker = byId.get("wire.ts:5")
    expect(marker?.unproven).toMatchObject({ path: "wire.ts", line: 5, reason: "spread" })
    expect(marker?.draft).toBe(true)

    expect(checkBlast(board).problems).toEqual([])
  })
})
