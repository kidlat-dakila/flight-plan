import * as assert from "assert"
import type { DocumentInput } from "../../../lib/schemas/document/schema"
import {
  fillNodes,
  fillWaypoints,
  reorderFiles,
} from "../fill"

/**
 * Writing prose into a scaffold, and nothing else.
 *
 * These are the agent's half. The structure was derived and is not theirs to
 * change, so none of these can add, remove or move a node or a waypoint — only
 * fill one in. The one thing they *can* do that the scaffold cannot is decide
 * the reading order.
 *
 * An unknown id is refused rather than ignored. An agent that invented one has
 * lost track of the document, and silently dropping the edit would leave it
 * believing a card it wrote is on the page.
 */

const document = (): DocumentInput =>
  ({
    schema: 1,
    meta: {
      kind: "walkthrough",
      repo: "acme/shop",
      at: { pr: 4 },
      head: "a".repeat(40),
      status: "drafting",
    },
    title: "Stock checks",
    contextBody: { context: "Why." },
    diagram: {
      type: "code",
      nodes: [
        {
          id: "n1",
          type: "logic",
          label: "checkout",
          changed: false,
          children: [
            { id: "n2", type: "logic", label: "priceOf", changed: true, children: [] },
          ],
        },
      ],
    },
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [
            {
              id: "w1",
              title: "priceOf",
              draft: true,
              reading: null,
              code: null,
              children: [
                { id: "w2", title: "Lines 1-2", draft: true, reading: null, code: null },
                { id: "w3", title: "Lines 7-8", draft: true, reading: null, code: null },
              ],
            },
          ],
        },
        { path: "src/b.ts", summary: [], waypoints: [] },
      ],
    },
  }) as unknown as DocumentInput

suite("filling in a waypoint", () => {
  test("writes the prose onto the card with that id, at any depth", () => {
    const { document: next, unknown } = fillWaypoints(document(), [
      { id: "w1", title: "Pricing moved behind a cache", reading: "It reads the cache first." },
      { id: "w3", reading: "And falls back when it misses." },
    ])

    assert.deepStrictEqual(unknown, [])
    const file = next.codeWalkthrough.files[0]
    assert.strictEqual(file?.waypoints[0]?.title, "Pricing moved behind a cache")
    assert.strictEqual(file.waypoints[0]?.reading, "It reads the cache first.")
    assert.strictEqual(file.waypoints[0]?.children?.[1]?.reading, "And falls back when it misses.")
    // Untouched cards keep the marker, so the completeness check still catches
    // the one the agent forgot.
    assert.strictEqual(file.waypoints[0]?.children?.[0]?.reading, null)
  })

  test("clears the draft mark when a title is written, and only then", () => {
    /*
     * The mark has to be cleared by the same call that replaces the text. A
     * gate that refused titles somebody wrote would be a gate that gets
     * switched off, and a mark left behind on a written title is exactly that.
     */
    const { document: next } = fillWaypoints(document(), [
      { id: "w1", title: "Pricing moved behind a cache" },
      { id: "w2", reading: "Only the reading." },
    ])

    const file = next.codeWalkthrough.files[0]
    const top = file?.waypoints[0] as { draft?: true } | undefined
    assert.strictEqual(top?.draft, undefined)
    // A reading is not a title: this card still has the scaffold's.
    assert.strictEqual((file?.waypoints[0]?.children?.[0] as { draft?: true }).draft, true)
    assert.strictEqual((file?.waypoints[0]?.children?.[1] as { draft?: true }).draft, true)
  })

  test("refuses an id the document has not got, and changes nothing", () => {
    const before = document()
    const { document: next, unknown } = fillWaypoints(before, [
      { id: "w1", reading: "Written." },
      { id: "w99", reading: "Invented." },
    ])

    assert.deepStrictEqual(unknown, ["w99"])
    // All or nothing: a partial apply would leave the agent unable to tell
    // which half of its call landed.
    assert.strictEqual(next.codeWalkthrough.files[0]?.waypoints[0]?.reading, null)
  })

  test("cannot add a waypoint, only fill one", () => {
    const { document: next } = fillWaypoints(document(), [{ id: "w1", reading: "Written." }])
    const file = next.codeWalkthrough.files[0]
    assert.strictEqual(file?.waypoints.length, 1)
    assert.strictEqual(file.waypoints[0]?.children?.length, 2)
  })
})

suite("filling in a diagram node", () => {
  test("writes the prose onto the node with that id", () => {
    const { document: next, unknown } = fillNodes(document(), [
      { id: "n2", label: "Price lookup", description: "Reads the cache." },
    ])

    assert.deepStrictEqual(unknown, [])
    const diagram = next.diagram as unknown as { nodes: { id: string; children?: unknown[] }[] }
    const child = (diagram.nodes[0]?.children as { label: string; description: string }[])[0]
    assert.strictEqual(child?.label, "Price lookup")
    assert.strictEqual(child.description, "Reads the cache.")
  })

  test("leaves `changed` exactly as the diff decided", () => {
    /*
     * The field is not in the edit's shape at all, so this is unsayable rather
     * than refused. Whether the branch touched a node is arithmetic over the
     * diff, and arithmetic is the half the agent is not asked to do.
     */
    const { document: next } = fillNodes(document(), [
      { id: "n1", label: "Checkout", description: "The whole flow." },
    ])
    const diagram = next.diagram as unknown as { nodes: { changed: boolean }[] }
    assert.strictEqual(diagram.nodes[0]?.changed, false)
  })

  test("refuses an id the diagram has not got", () => {
    const { unknown } = fillNodes(document(), [{ id: "n9", label: "Nowhere" }])
    assert.deepStrictEqual(unknown, ["n9"])
  })
})

suite("the reading order the agent decides", () => {
  test("puts the file sections in the order it was given", () => {
    const { document: next, unknown } = reorderFiles(document(), ["src/b.ts", "src/a.ts"])
    assert.deepStrictEqual(unknown, [])
    assert.deepStrictEqual(
      next.codeWalkthrough.files.map((file) => file.path),
      ["src/b.ts", "src/a.ts"],
    )
  })

  test("refuses a path the walkthrough has not got", () => {
    const { unknown } = reorderFiles(document(), ["src/b.ts", "src/nope.ts"])
    assert.deepStrictEqual(unknown, ["src/nope.ts"])
  })

  test("refuses an order that leaves a file out", () => {
    // Otherwise a file silently drops off the end of the document, which is the
    // one thing a reordering must never do.
    const { unknown } = reorderFiles(document(), ["src/a.ts"])
    assert.deepStrictEqual(unknown, ["src/b.ts"])
  })
})

/*
 * The scaffold's node label is a placeholder, and writing one clears the mark.
 *
 * The same rule the waypoint titles hold to, for the same reason: the mark
 * means "nobody has rewritten this", and leaving it after somebody has keeps a
 * node on the worklist for work that is done.
 */
suite("the draft mark on a diagram node", () => {
  const board = (nodes: unknown[]): DocumentInput =>
    ({ ...document(), diagram: { type: "code", nodes } }) as unknown as DocumentInput

  const nodesOf = (d: DocumentInput): Record<string, unknown>[] =>
    (d.diagram as unknown as { nodes: Record<string, unknown>[] }).nodes

  test("clears the mark when a label is written", () => {
    const { document: next, unknown } = fillNodes(
      board([{ id: "n1", type: "logic", label: "priceOf", draft: true }]),
      [{ id: "n1", label: "Prices a basket" }],
    )
    assert.deepStrictEqual(unknown, [])
    assert.strictEqual(nodesOf(next)[0]?.label, "Prices a basket")
    assert.strictEqual(nodesOf(next)[0]?.draft, undefined)
  })

  test("keeps the mark when only the sublabel is written", () => {
    const { document: next } = fillNodes(
      board([{ id: "n1", type: "logic", label: "priceOf", draft: true }]),
      [{ id: "n1", sublabel: "priceOf" }],
    )
    assert.strictEqual(nodesOf(next)[0]?.draft, true)
  })

  test("clears the mark on a nested node too", () => {
    const { document: next } = fillNodes(
      board([
        {
          id: "n1",
          type: "logic",
          label: "a",
          children: [{ id: "n2", type: "logic", label: "priceOf", draft: true }],
        },
      ]),
      [{ id: "n2", label: "Prices a basket" }],
    )
    const kids = nodesOf(next)[0]?.children as Record<string, unknown>[]
    assert.strictEqual(kids[0]?.draft, undefined)
  })
})
