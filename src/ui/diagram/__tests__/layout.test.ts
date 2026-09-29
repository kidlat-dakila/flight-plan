import { describe, expect, it } from "vitest"
import { bounds, cardHeight, layout, NODE_HEIGHT, NODE_WIDTH, type Placed } from "../layout"
import type { Diagram, DiagramNode } from "../../../lib/schemas/diagram/schema"

const node = (over: Partial<DiagramNode> & { id: string }): DiagramNode =>
  ({ type: "logic", label: over.id, ...over }) as DiagramNode

const diagram = (nodes: DiagramNode[], edges: Diagram["edges"] = []): Diagram =>
  ({ nodes, edges }) as Diagram

describe("cardHeight", () => {
  it("should never go below the CSS floor", () => {
    // Telling the layout a card is shorter than `min-height` is what let cards
    // overlap in the first place.
    expect(cardHeight(node({ id: "a", label: "x" }))).toBe(NODE_HEIGHT)
  })

  it("should grow when the label wraps", () => {
    /*
     * The long one is deliberately longer than the format allows — a label is
     * meant to be about five words. The estimator still has to cope with one
     * that is not, because a card taller than the layout believes is what makes
     * two cards overlap.
     */
    const short = cardHeight(node({ id: "a", label: "Refuses an unknown order" }))
    const long = cardHeight(
      node({
        id: "b",
        label:
          "Refuses an order whose lines cannot all be fulfilled from the warehouse it was routed to",
      }),
    )
    expect(long).toBeGreaterThan(short)
  })

  it("should grow again for a sublabel", () => {
    const label = "a".repeat(60)
    expect(
      cardHeight(node({ id: "b", label, sublabel: "b".repeat(70) })),
    ).toBeGreaterThan(cardHeight(node({ id: "a", label })))
  })
})

/** No two cards may share any pixel, which is the layout's one hard promise. */
function expectNoOverlaps(placed: ReturnType<typeof layout>): void {
  const boxes = [...placed.values()]
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!
      const b = boxes[j]!
      const overlaps =
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false)
    }
  }
}

describe("layout", () => {
  it("should keep automatically placed cards from overlapping", () => {
    // The regression this guards: dagre spaces by the sizes it is given, so a
    // card taller than the layout believed could sit on top of its neighbour.
    const nodes = [
      node({ id: "a", label: "entry" }),
      node({ id: "b", label: "a very long label that certainly wraps onto more lines" }),
      node({ id: "c", label: "another long label that also wraps a good deal" }),
      node({ id: "d", label: "tail" }),
    ]
    const placed = layout(
      diagram(nodes, [
        { source: "a", target: "b", kind: "child" },
        { source: "a", target: "c", kind: "child" },
        { source: "b", target: "d", kind: "child" },
        { source: "c", target: "d", kind: "child" },
      ] as Diagram["edges"]),
    )
    expectNoOverlaps(placed)
  })

  /*
   * The same guarantee across the two passes, which is where it broke.
   *
   * Each function is laid out on its own and then placed as one box, so a box
   * measured from the origin rather than from its own content is a box a
   * neighbour can be put inside. Two trees of different depths called from the
   * same node land on one rank, which is where any error in the size shows.
   */
  it("should keep two functions on the same rank apart", () => {
    const placed = layout(
      diagram(
        [
          node({ id: "caller", label: "Starts the read" }),
          node({ id: "deep", label: "Reads the file" }),
          node({ id: "deep-1", label: "Opens it" }),
          node({ id: "deep-2", label: "Reads the bytes" }),
          node({ id: "deep-3", label: "Closes it" }),
          node({ id: "shallow", label: "Logs the read" }),
        ],
        [
          { source: "caller", target: "deep", kind: "call" },
          { source: "caller", target: "shallow", kind: "call" },
          { source: "deep", target: "deep-1", kind: "child" },
          { source: "deep-1", target: "deep-2", kind: "child" },
          { source: "deep-2", target: "deep-3", kind: "child" },
        ] as Diagram["edges"],
      ),
    )
    expectNoOverlaps(placed)
  })
})

describe("bounds", () => {
  const placedAt = (entries: [string, number, number][]): Map<string, Placed> =>
    new Map(
      entries.map(([id, x, y]) => [
        id,
        { id, x, y, width: NODE_WIDTH, height: NODE_HEIGHT },
      ]),
    )

  it("should return null for an empty diagram", () => {
    expect(bounds(new Map())).toBeNull()
  })

  it("should cover every card, including the last one's width", () => {
    expect(bounds(placedAt([["a", 0, 0], ["b", 300, 100]]))).toEqual({
      x: 0,
      y: 0,
      width: 300 + NODE_WIDTH,
      height: 100 + NODE_HEIGHT,
    })
  })

  it("should handle negative positions", () => {
    expect(bounds(placedAt([["a", -50, -20]]))).toEqual({
      x: -50,
      y: -20,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
})
