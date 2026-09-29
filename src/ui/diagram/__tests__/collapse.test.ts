import { describe, expect, it } from "vitest"
import { collapsibleIds, visibleDiagram } from "../collapse"
import type {
  Diagram,
  DiagramEdge,
  DiagramNode,
  EdgeKind,
} from "../../../lib/schemas/diagram/schema"

const card = (id: string): DiagramNode => ({ id, type: "logic", label: id })
const edge = (source: string, target: string, kind: EdgeKind): DiagramEdge => ({ source, target, kind })

/**
 * A change `F` with two steps — one of them a branch `F#1` with an arm `F#1.0` —
 * reached across the call chain by `G`.
 *
 *   G --call--> F --child--> F#0
 *                 --child--> F#1 --child--> F#1.0
 */
const board = (): Diagram => ({
  type: "code",
  nodes: [card("F"), card("F#0"), card("F#1"), card("F#1.0"), card("G")],
  edges: [
    edge("G", "F", "call"),
    edge("F", "F#0", "child"),
    edge("F", "F#1", "child"),
    edge("F#1", "F#1.0", "child"),
  ],
})

const ids = (diagram: Diagram): string[] => diagram.nodes.map((node) => node.id).sort()

describe("collapse", () => {
  it("collapsing a function hides its steps but keeps the call chain", () => {
    const visible = visibleDiagram(board(), new Set(["F"]))
    expect(ids(visible)).toEqual(["F", "G"])
    expect(visible.edges).toEqual([edge("G", "F", "call")])
  })

  it("collapsing a branch hides only its arm, keeping sibling steps", () => {
    const visible = visibleDiagram(board(), new Set(["F#1"]))
    expect(ids(visible)).toEqual(["F", "F#0", "F#1", "G"])
    expect(visible.edges).not.toContainEqual(edge("F#1", "F#1.0", "child"))
    expect(visible.edges).toContainEqual(edge("F", "F#1", "child"))
  })

  it("collapsing a function hides nested branch arms transitively", () => {
    const visible = visibleDiagram(board(), new Set(["F"]))
    expect(visible.nodes.some((node) => node.id === "F#1.0")).toBe(false)
  })

  it("returns the diagram unchanged when nothing is collapsed", () => {
    const original = board()
    expect(visibleDiagram(original, new Set())).toBe(original)
  })

  it("collapsibleIds is every node with steps below it, and no others", () => {
    expect([...collapsibleIds(board())].sort()).toEqual(["F", "F#1"])
  })
})
