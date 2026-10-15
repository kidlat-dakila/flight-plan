import { createArtifactContext, DRAFT_ARTIFACT, KEY, SEGMENT_KEY, PRICE_PATH, SUBTOTAL_PATH, TWO_SEGMENT_ARTIFACT, messageOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
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

const OFF = { journey: false, blast: false, walkthrough: true, findings: false }

describe("updateNodes", () => {
  it("refuses to write a section the reviewer chose not to generate, and says so", async () => {
    const context = await createArtifactContext({ ...DRAFT_ARTIFACT, sections: OFF })
    const refusalOf = async (edit: object): Promise<string> => messageOf(await updateNodes({ ...SEGMENT_KEY, ...edit }, context))

    await expect(refusalOf({ journey: [{ id: "j-subtotal", label: "Rounds the cart total once" }] }))
      .resolves.toBe("The reviewer chose not to generate the Journey Flow Diagram for this review. Do not write this, and do not ask the reviewer about it. Nothing was written.")
    await expect(refusalOf({ journeyDescription: "A shopper opens the cart." })).resolves.toContain("the Journey Flow Diagram")
    await expect(refusalOf({ blast: [{ path: "src/cart/CartTotal.tsx", impactType: "unaffected" }] })).resolves.toContain("the Blast Diagram")
    await expect(refusalOf({ waypoints: [{ id: "w3", reading: "Rounds once.", findings: [BUG] }] })).resolves.toContain("the findings")
    await expect(waypointOf(context, "w3")).resolves.toMatchObject({ reading: "", findings: [] })
  })

  it("writes the sections that are on beside the ones that are off", async () => {
    const context = await createArtifactContext({ ...DRAFT_ARTIFACT, sections: OFF })

    await expect(updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w3", reading: "Rounds once." }] }, context)).resolves.toMatchObject({ kind: "written" })
  })

  it("writes a waypoint's prose and findings, and reports what is left", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...SEGMENT_KEY,
      waypoints: [{
        id: "w3",
        title: "Rounded the sum once",
        reading: "The author moved the rounding here from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
        needsAttention: "This is the rule the pull request exists for.",
        findings: [BUG],
      }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 1 entry.", nodes: { complete: 1, incomplete: 7 }, unwritten: { total: 9 } })
    await expect(waypointOf(context, "w3")).resolves.toStrictEqual({
      id: "w3",
      declaration: "subtotal",
      codeBlocks: [],
      title: "Rounded the sum once",
      reading: "The author moved the rounding here from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
      needsAttention: "This is the rule the pull request exists for.",
      findings: [BUG],
      children: [],
    })
  })

  it("writes Journey Flow Diagram nodes and Blast Diagram files in one batch", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...SEGMENT_KEY,
      journey: [{ id: "j-subtotal", label: "Rounds the cart total once" }],
      blast: [{ path: "src/cart/CartTotal.tsx", impactType: "unaffected" }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 2 entries.", unwritten: { total: 8 } })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments[0]).toMatchObject({
      journey: { journeyNodes: [{ id: "j-subtotal", label: "Rounds the cart total once" }] },
      blast: {
        nodes: [
          { path: "src/cart/CartPage.tsx", impactType: null },
          { path: "src/cart/CartTotal.tsx", impactType: "unaffected", impactReason: null },
          { path: SUBTOTAL_PATH, impactType: null },
        ],
      },
    })
  })

  it("writes none of a batch when one id is unknown", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero" }, { id: "w9", title: "Nothing" }] }, context)

    expect(writing).toStrictEqual({
      kind: "rejected",
      message: "This segment has no waypoint `w9`. Read the overview for the ones it has. Nothing was written.",
    })
    await expect(waypointOf(context, "w1")).resolves.toMatchObject({ title: null })
  })

  it("refuses a code link that does not resolve in the files the artifact holds", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({
      ...SEGMENT_KEY,
      waypoints: [{ id: "w1", reading: "See [`lineTotal()`](code:src/cart/subtotal.ts#lineTotl) and [the caller](code:src/checkout.ts#L4-9) and [line 4](code:src/cart/subtotal.ts#L4)." }],
    }, context)

    expect(messageOf(writing)).toContain("These code links do not resolve: `code:src/cart/subtotal.ts#lineTotl`, `code:src/checkout.ts#L4-9`.")
  })

  it("refuses a finding id the artifact already uses on another waypoint", async () => {
    const context = await createArtifactContext()
    await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w2", findings: [BUG] }] }, context)

    const writing = await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w3", findings: [BUG] }] }, context)

    expect(messageOf(writing)).toContain("`f-float` would be used twice")
  })

  it("writes an id two segments share only in the segment the call names, and refuses a segment the artifact does not have", async () => {
    const context = await createArtifactContext(TWO_SEGMENT_ARTIFACT)

    expect(messageOf(await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero" }] }, context))).toContain("This artifact has no segment with the id all.")
    await expect(updateNodes({ ...KEY, segmentId: "second", waypoints: [{ id: "w1", title: "Returned zero" }] }, context)).resolves.toMatchObject({ kind: "written" })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments.map((segment) => segment.walkthrough.files[0]?.waypoints[0]?.title)).toStrictEqual([null, "Returned zero"])
  })

  it("writes the segment's own fields in the same call as its nodes", async () => {
    const context = await createArtifactContext()
    const markdown = "A cart could be a cent off.\n\n## Implementation\n\n- Rounded the sum in [`subtotal()`](code:src/cart/subtotal.ts#subtotal)."

    const writing = await updateNodes({
      ...SEGMENT_KEY,
      title: "Rounding moves to the total",
      context: markdown,
      order: { files: [SUBTOTAL_PATH, PRICE_PATH] },
      journeyDescription: "When a cart is shown, the total is summed and rounded once.",
      waypoints: [{ id: "w1", title: "Returned zero" }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 5 entries.", unwritten: { total: 8 } })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      segments: [{
        id: "all",
        title: "Rounding moves to the total",
        context: markdown,
        journey: { description: "When a cart is shown, the total is summed and rounded once." },
        walkthrough: { files: [{ path: SUBTOTAL_PATH }, { path: PRICE_PATH, waypoints: [{ title: "Returned zero" }] }] },
      }],
    })
  })

  it("writes none of a call when its order leaves a File Section out", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({ ...SEGMENT_KEY, context: "A cart could be a cent off.", order: { files: [SUBTOTAL_PATH] } }, context)

    expect(writing).toStrictEqual({
      kind: "rejected",
      message: "An order names every File Section exactly once, and this one leaves out `src/catalog/price.ts`. Nothing was written.",
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ context: "" }] })
  })

  it("refuses an order that names a path twice or a path with no File Section", async () => {
    const context = await createArtifactContext()

    expect(messageOf(await updateNodes({ ...SEGMENT_KEY, order: { files: [SUBTOTAL_PATH, PRICE_PATH, PRICE_PATH] } }, context))).toContain("names a path twice")
    expect(messageOf(await updateNodes({ ...SEGMENT_KEY, order: { files: [SUBTOTAL_PATH, PRICE_PATH, "src/gone.ts"] } }, context))).toContain("no File Section for `src/gone.ts`")
  })

  it("refuses a context whose code link does not resolve", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({ ...SEGMENT_KEY, context: "- [The total](code:src/cart/total.ts#total) is rounded once." }, context)

    expect(messageOf(writing)).toContain("`code:src/cart/total.ts#total`")
  })

  it("refuses a Journey Flow Diagram description on a segment that has no diagram", async () => {
    const context = await createArtifactContext(TWO_SEGMENT_ARTIFACT)

    const writing = await updateNodes({ ...KEY, segmentId: "first", title: "Rounding", journeyDescription: "A cart is shown." }, context)

    expect(messageOf(writing)).toBe("This segment has no Journey Flow Diagram to describe. Nothing was written.")
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ title: TWO_SEGMENT_ARTIFACT.segments[0].title }, {}] })
  })

  it("refuses a Journey Flow Diagram description whose code link does not resolve", async () => {
    const context = await createArtifactContext()

    const writing = await updateNodes({ ...SEGMENT_KEY, journeyDescription: "The cart calls [`total()`](code:src/cart/total.ts#total)." }, context)

    expect(writing).toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ journey: { description: null } }] })
  })

  it("refuses a call that writes nothing", async () => {
    const context = await createArtifactContext()

    await expect(updateNodes(SEGMENT_KEY, context)).resolves.toMatchObject({ kind: "rejected", message: "Give at least one of title, context, order, journeyDescription, waypoints, journey, blast or contextCodeBlocks. Nothing was written." })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero" }] }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
