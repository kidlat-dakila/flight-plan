import { declineWriteUp } from "@/procedures/decline-write-up"
import { getWriteUpPlan } from "@/procedures/get-write-up-plan"
import { createArtifactContext, KEY, WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

describe("declineWriteUp", () => {
  it("keeps with the review that the write-up was offered, and changes nothing else", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    const before = await context.reviewStore.readScaffold(KEY)

    await expect(declineWriteUp(KEY, context)).resolves.toStrictEqual({ kind: "declined" })

    await expect(context.reviewStore.readScaffold(KEY)).resolves.toStrictEqual({
      artifact: before?.artifact,
      baseCommit: before?.baseCommit,
      request: { ...before?.request, isWriteUpDeclined: true },
    })
    await expect(getWriteUpPlan({ ...KEY, sections: null }, context)).resolves.toMatchObject({ kind: "plan", isOffered: true })
  })

  it("finds nothing for a review target with no review artifact", async () => {
    await expect(declineWriteUp(KEY, await createArtifactContext(null))).resolves.toBeNull()
  })
})
