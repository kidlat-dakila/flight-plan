import { completeArtifact } from "@/procedures/complete-artifact"
import { createArtifactContext, KEY, SEGMENT_KEY, PRICE_PATH, SUBTOTAL_PATH, WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { updateNodes } from "@/procedures/update-nodes"

const fillEverything = async (context: Awaited<ReturnType<typeof createArtifactContext>>): Promise<void> => {
  await updateNodes({
    ...SEGMENT_KEY,
    context: "A cart could be a cent off.",
    files: [{ path: PRICE_PATH, title: "A missing price is zero" }, { path: SUBTOTAL_PATH, title: "Rounding moves to the subtotal" }],
    waypoints: ["w1", "w2", "w3"].map((id) => ({ id, title: `Modified ${id}`, reading: `The author modified ${id}.` })),
  }, context)
}

describe("completeArtifact", () => {
  it("changes nothing and lists what is missing while work is left", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)

    const completion = await completeArtifact({ ...KEY, limit: 2 }, context)

    expect(completion).toMatchObject({
      kind: "unfinished",
      total: 9,
      remaining: 7,
      missing: [{ target: "context", needs: "context" }, { target: "file", needs: "file-title" }],
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "drafting" })
  })

  it("marks the artifact complete once nothing is missing", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    await fillEverything(context)

    await expect(completeArtifact(KEY, context)).resolves.toStrictEqual({ kind: "finished" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "complete" })
  })

  it("refuses an artifact whose bug has no solution", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    await fillEverything(context)
    await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w3", findings: [{ id: "f-float", kind: "bug", title: "Float sum", reading: "The sum is a float." }] }] }, context)

    await expect(completeArtifact(KEY, context)).resolves.toMatchObject({ kind: "unfinished", total: 1, missing: [{ id: "w3", needs: "solution" }] })
  })

  it("puts a complete artifact back to drafting when it is written again", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    await fillEverything(context)
    await completeArtifact(KEY, context)

    await updateNodes({ ...SEGMENT_KEY, waypoints: [{ id: "w1", title: "Returned zero for an unknown SKU" }] }, context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "drafting" })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(completeArtifact(KEY, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
