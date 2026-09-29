import { describe, expect, test } from "vitest"
import { cardState, type CardData } from "../DiagramNodeCard"
import type { DiagramNode } from "../../../lib/schemas/diagram/schema"

const node = (over: Partial<DiagramNode> = {}): DiagramNode =>
  ({ id: "n", type: "logic", label: "Does the thing", ...over }) as DiagramNode

/*
 * Which card is lit, decided from the selection rather than baked into it.
 *
 * This used to be computed where the React Flow nodes are built, which made
 * every node object a new identity on every selection change. React Flow reads
 * `measured` off the object it is handed, so a new identity means a node with
 * no measurements, and an unmeasured node renders `visibility: hidden`. Scroll
 * past a few waypoints and the whole board could go blank.
 */
describe("cardState", () => {
  test("lights the node the reader last clicked", () => {
    // A click is what keeps a card lit; there is no waypoint binding any more.
    expect(cardState(node({ id: "repair" }), "repair", true)).toEqual({
      active: true,
      dimmed: false,
    })
  })

  test("dims the others once something is active", () => {
    expect(cardState(node({ id: "n" }), "repair", true)).toEqual({
      active: false,
      dimmed: true,
    })
  })

  test("dims nothing when no card is active", () => {
    // Dimming the whole board because nothing is clicked would make the diagram
    // look broken.
    expect(cardState(node({ id: "n" }), null, false)).toEqual({
      active: false,
      dimmed: false,
    })
  })
})

/*
 * The invariant the bug turned on.
 *
 * React Flow keeps a node's measurements only while the object it was handed
 * keeps its identity, so anything in `CardData` that changes as the reader
 * scrolls costs every node its measurements and hides the whole board. This
 * asserts the shape rather than the behaviour, because the shape is what
 * somebody would casually undo.
 */
describe("card data", () => {
  test("carries nothing that changes as the reader scrolls", () => {
    const fields = Object.keys({
      node: node(),
      code: [],
      clickable: true,
    } satisfies CardData)
    expect(fields.sort()).toEqual(["clickable", "code", "node"])
    // Named explicitly: these two used to live here and must not come back.
    expect(fields).not.toContain("active")
    expect(fields).not.toContain("dimmed")
  })
})
