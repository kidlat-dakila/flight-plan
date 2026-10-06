import { createArtifactContext, KEY, PRICE_PATH, SUBTOTAL_PATH, TWO_SEGMENT_ARTIFACT, messageOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { updateNodes } from "@/procedures/update-nodes"

const BUG = {
  id: "f-float",
  kind: "bug" as const,
  title: "`subtotal()` rounds a float sum",
  reading: "The sum is a float before it is rounded.",
  trace: ["A cart holds three lines."],
  solution: "  Math.round(cents) / 100",
}

const waypointOf = async (context: Awaited<ReturnType<typeof createArtifactContext>>, id: string) => {
  const artifact = await context.reviewStore.findArtifact(KEY)
  return artifact?.segments.flatMap(waypointsOf).find((located) => located.waypoint.id === id)?.waypoint
}

describe("updateNodes", () => {
  it("writes a waypoint's prose and findings, and reports what is left", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...KEY,
      waypoints: [{
        id: "w3",
        title: "Rounded the sum once",
        reading: "The author moved the rounding here from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
        needsAttention: "This is the rule the pull request exists for.",
        findings: [BUG],
      }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 1 entry.", unwritten: { total: 11 } })
    await expect(waypointOf(context, "w3")).resolves.toStrictEqual({
      id: "w3",
      declaration: "subtotal",
      title: "Rounded the sum once",
      reading: "The author moved the rounding here from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
      needsAttention: "This is the rule the pull request exists for.",
      findings: [BUG],
      children: [],
    })
  })

  it("writes File Sections, Journey Flow Diagram nodes and Blast Diagram nodes in one batch", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...KEY,
      files: [{ path: PRICE_PATH, title: "A missing price is zero", summary: ["Returns 0 for an unknown SKU."] }],
      journey: [{ id: "j-subtotal", label: "Rounds the cart total once", category: "data" }],
      blast: [
        { id: "b-subtotal", contract: { before: null, now: "Returns the total rounded to cents." } },
        { id: "b-cart-total", verdict: "unaffected", effect: "It formats the number it is given." },
      ],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 4 entries.", unwritten: { total: 8 } })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments[0]).toMatchObject({
      walkthrough: { files: [{ path: PRICE_PATH, title: "A missing price is zero", summary: ["Returns 0 for an unknown SKU."] }, { path: SUBTOTAL_PATH }] },
      journey: { nodes: [{ id: "click-checkout" }, { id: "j-subtotal", label: "Rounds the cart total once", category: "data" }] },
      blast: {
        nodes: [
          { id: "b-subtotal", contract: { before: null, now: "Returns the total rounded to cents." } },
          { id: "b-cart-total", verdict: "unaffected", effect: "It formats the number it is given." },
          { id: "b-cart-page", verdict: null },
        ],
      },
    })
  })

  it("writes none of a batch when one id is unknown", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({ ...KEY, waypoints: [{ id: "w1", title: "Returned zero" }, { id: "w9", title: "Nothing" }] }, context)

    expect(writing).toStrictEqual({
      kind: "rejected",
      message: "This artifact has no waypoint `w9`. Read the overview for the ones it has. Nothing was written.",
    })
    await expect(waypointOf(context, "w1")).resolves.toMatchObject({ title: null })
  })

  it("refuses a code link that does not resolve in the files the artifact holds", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...KEY,
      waypoints: [{ id: "w1", reading: "See [`lineTotal()`](code:src/cart/subtotal.ts#lineTotl) and [the caller](code:src/checkout.ts#L4-9) and [line 4](code:src/cart/subtotal.ts#L4)." }],
    }, context)

    expect(messageOf(writing)).toContain("These code links do not resolve: `code:src/cart/subtotal.ts#lineTotl`, `code:src/checkout.ts#L4-9`.")
  })

  it("refuses a finding id the artifact already uses on another waypoint", async () => {
    const context = await createArtifactContext()
    await updateNodes({ ...KEY, waypoints: [{ id: "w2", findings: [BUG] }] }, context)

    const writing = await updateNodes({ ...KEY, waypoints: [{ id: "w3", findings: [BUG] }] }, context)

    expect(messageOf(writing)).toContain("`f-float` would be used twice")
  })

  it("refuses an id two segments share until the call names the segment", async () => {
    const context = await createArtifactContext(TWO_SEGMENT_ARTIFACT)

    expect(messageOf(await updateNodes({ ...KEY, waypoints: [{ id: "w1", title: "Returned zero" }] }, context))).toContain("More than one segment has a waypoint `w1`.")
    await expect(updateNodes({ ...KEY, segmentId: "second", waypoints: [{ id: "w1", title: "Returned zero" }] }, context)).resolves.toMatchObject({ kind: "written" })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments.map((segment) => segment.walkthrough.files[0]?.waypoints[0]?.title)).toStrictEqual([null, "Returned zero"])
  })

  it("refuses a call that writes nothing", async () => {
    const context = await createArtifactContext()

    await expect(updateNodes(KEY, context)).resolves.toMatchObject({ kind: "rejected", message: "Give waypoints, files, journey or blast. Nothing was written." })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(updateNodes({ ...KEY, waypoints: [{ id: "w1", title: "Returned zero" }] }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
