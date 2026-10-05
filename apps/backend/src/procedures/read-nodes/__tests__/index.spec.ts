import { createArtifactContext, KEY, SUBTOTAL_PATH } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { readNodes } from "@/procedures/read-nodes"

describe("readNodes", () => {
  it("hands out the next unwritten items with what each needs, and counts the rest", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, unfilled: true, limit: 2 }, context)

    expect(reading).toMatchObject({
      kind: "unfilled",
      total: 10,
      remaining: 8,
      unwritten: { total: 15 },
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

  it("groups the context's three parts into one item", async () => {
    const context = await createArtifactContext()

    const reading = await readNodes({ ...KEY, unfilled: true, needs: ["context", "overview", "implementation"] }, context)

    expect(reading).toMatchObject({ kind: "unfilled", total: 1, items: [{ kind: "context", id: null, needs: ["context", "overview", "implementation"] }] })
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
