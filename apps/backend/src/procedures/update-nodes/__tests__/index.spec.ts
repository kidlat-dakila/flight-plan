import { createArtifactContext, KEY, SEGMENT_KEY, PRICE_PATH, SUBTOTAL_PATH, TWO_SEGMENT_ARTIFACT, messageOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
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
      ...SEGMENT_KEY,
      waypoints: [{
        id: "w3",
        title: "Rounded the sum once",
        reading: "The author moved the rounding here from [`lineTotal()`](code:src/cart/subtotal.ts#lineTotal).",
        needsAttention: "This is the rule the pull request exists for.",
        findings: [BUG],
      }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 1 entry.", nodes: { complete: 2, incomplete: 9 }, unwritten: { total: 11 } })
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
      ...SEGMENT_KEY,
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
      intro: "The price first, then the total.",
      order: { files: [SUBTOTAL_PATH, PRICE_PATH] },
      waypoints: [{ id: "w1", title: "Returned zero" }],
    }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote 5 entries.", unwritten: { total: 11 } })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      segments: [{
        id: "all",
        title: "Rounding moves to the total",
        context: markdown,
        walkthrough: { intro: "The price first, then the total.", files: [{ path: SUBTOTAL_PATH }, { path: PRICE_PATH, waypoints: [{ title: "Returned zero" }] }] },
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

  it("takes an intro back when it is given null", async () => {
    const context = await createArtifactContext()
    await updateNodes({ ...SEGMENT_KEY, intro: "The price first, then the total." }, context)

    await updateNodes({ ...SEGMENT_KEY, intro: null }, context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ segments: [{ walkthrough: { intro: null } }] })
  })

  it("refuses a call that writes nothing", async () => {
    const context = await createArtifactContext()

    await expect(updateNodes(SEGMENT_KEY, context)).resolves.toMatchObject({ kind: "rejected", message: "Give at least one of title, context, intro, order, waypoints, files, journey or blast. Nothing was written." })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero" }] }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
