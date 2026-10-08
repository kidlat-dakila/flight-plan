import { createArtifactContext, DRAFT_ARTIFACT, DRAFT_SEGMENT, KEY, SUBTOTAL_PATH } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { readNodes } from "@/procedures/read-nodes"

describe("readNodes", () => {
  it("hands out the next unwritten items with what each needs, and counts the rest", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, unfilled: true, limit: 2 }, context)

    expect(reading).toMatchObject({
      kind: "unfilled",
      total: 10,
      remaining: 8,
      unwritten: { total: 13 },
      items: [
        { kind: "blast-node", id: "b-subtotal", needs: ["contract"], code: { path: SUBTOTAL_PATH, lineStart: 6, lineEnd: 9, change: "changed" } },
        { kind: "blast-node", id: "b-cart-total", needs: ["verdict"], node: { usesIds: ["b-subtotal"] }, code: null },
      ],
    })
  })

  it("attaches the code a waypoint covers, with its diff marks", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, unfilled: true, needs: ["reading"], limit: 5 }, context)

    expect(reading).toMatchObject({
      kind: "unfilled",
      total: 3,
      items: [
        { kind: "waypoint", id: "w1", needs: ["reading"] },
        {
          kind: "waypoint",
          id: "w2",
          segmentId: "all",
          file: SUBTOTAL_PATH,
          needs: ["reading"],
          node: { declaration: "lineTotal", title: null },
          code: { text: " 3\tconst lineTotal = (sku: string, units: number): number =>\n-\t  Math.round(priceOf(sku) * units * 100) / 100\n+4\t  priceOf(sku) * units" },
        },
        { kind: "waypoint", id: "w3" },
      ],
    })
  })

  it("lists an unwritten context as one item with no id", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, unfilled: true, needs: ["context"] }, context)

    expect(reading).toMatchObject({ kind: "unfilled", total: 1, items: [{ kind: "context", id: null, needs: ["context"], node: { context: "" } }] })
  })

  it("selects items by id, and says which id the artifact does not have", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, ids: ["w3", SUBTOTAL_PATH, "j-subtotal", "w9"] }, context)

    expect(reading).toMatchObject({
      kind: "selected",
      items: [
        { kind: "waypoint", id: "w3", needs: ["title", "reading"] },
        { kind: "file", id: SUBTOTAL_PATH, needs: ["file-title"], node: { waypointIds: ["w2", "w3"] } },
        { kind: "journey-node", id: "j-subtotal", needs: ["label"], code: { lineStart: 6 } },
        { kind: "unknown", id: "w9", node: null },
      ],
    })
  })

  it("hands out an unlabelled return of a component as an item of its own, under its component", async () => {
    const unlabelled = { id: "j-subtotal#return@7", statement: "if (lines.length === 0) return", reference: [7, 7] as const, changeType: "none" as const, isAdded: false, label: null, description: null, tracedLines: [], renderedNodeIds: [], codeViews: [] }
    const journey = DRAFT_SEGMENT.journey === null
      ? null
      : { ...DRAFT_SEGMENT.journey, nodes: DRAFT_SEGMENT.journey.nodes.map((node) => (node.kind === "declaration" ? { ...node, returns: [unlabelled] } : node)) }
    const context = await createArtifactContext({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, journey }] })

    const reading = await readNodes({ ...KEY, unfilled: true, needs: ["label"], limit: 5 }, context)

    expect(reading).toMatchObject({
      kind: "unfilled",
      total: 2,
      items: [
        { kind: "journey-node", id: "j-subtotal", needs: ["label"] },
        {
          kind: "journey-node",
          id: "j-subtotal#return@7",
          needs: ["label"],
          file: SUBTOTAL_PATH,
          node: { statement: "if (lines.length === 0) return", label: null },
          lineage: [{ id: "j-subtotal", declaration: "subtotal" }],
        },
      ],
    })
  })

  it("cuts the code at the line limit", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, ids: ["w3"], maxLines: 1 }, context)

    expect(reading).toMatchObject({ items: [{ code: { omittedLineCount: 3 } }] })
  })

  it("rejects a call that asks for neither ids nor what is unfilled", async () => {
    const context = await createArtifactContext()

    await expect(readNodes(KEY, context)).resolves.toMatchObject({ kind: "rejected" })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(readNodes({ ...KEY, unfilled: true }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
