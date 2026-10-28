import type { ProcedureContext } from "@/procedures/context"
import { createReview } from "@/procedures/create-review"
import { getReview } from "@/procedures/get-review"
import type { RecordedChange } from "@/procedures/get-review/utils/change-reader"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { createCreationContext, createRecordingOpener, DELIVERY_CHANGE, KEY, PAGE_INPUT } from "./creation-harness"

const MOVED_CHANGE: RecordedChange = {
  ...DELIVERY_CHANGE,
  revision: { ...DELIVERY_CHANGE.revision, headCommit: "2222222aaaaaaa" },
  texts: { "src/delivery/estimate.ts": "export const estimate = (zone: string) =>\n  zone === \"local\" ? 1 : 4\n" },
}

const storedScaffoldOf = async (context: ProcedureContext): Promise<ReviewScaffold> => {
  const scaffold = await context.reviewStore.readScaffold(KEY)
  if (scaffold === null) throw new Error("The review artifact was not created.")
  return scaffold
}

const movedContextOf = (context: ProcedureContext) => {
  const openRepository = createRecordingOpener([MOVED_CHANGE], null)
  const findRevision = vi.fn(context.changeReader.findRevision)
  return { ...context, openRepository, changeReader: { ...context.changeReader, findRevision } }
}

describe("getReview of a review artifact created against a chosen branch", () => {
  it("catches up against the stored branch once the head moves", async () => {
    const context = createCreationContext({ repositoryBaseBranch: "main" })
    await createReview({ ...KEY, baseBranch: "develop" }, context)
    const moved = movedContextOf({ ...context, changeReader: createCreationContext({ changes: [MOVED_CHANGE] }).changeReader })

    await getReview(PAGE_INPUT, moved)

    expect(moved.openRepository.mock.lastCall?.[2]).toBe("develop")
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toMatchObject({
      baseBranch: "develop",
      artifact: { commit: "2222222aaaaaaa" },
    })
  })

  it("reads the live target detail of the review against the stored branch", async () => {
    const context = createCreationContext({ repositoryBaseBranch: "main" })
    await createReview({ ...KEY, baseBranch: "develop" }, context)
    const watched = movedContextOf(context)

    await getReview(PAGE_INPUT, watched)

    expect(watched.changeReader.findRevision).toHaveBeenCalledWith("/Users/dev/projects/storefront", "feature/gift-card-balance", "develop")
  })

  it("catches up a review saved with no branch against the repository's base branch", async () => {
    const context = createCreationContext({ repositoryBaseBranch: "trunk" })
    await createReview({ ...KEY, baseBranch: "develop" }, context)
    const scaffold = await storedScaffoldOf(context)
    await context.reviewStore.writeScaffold(KEY, { artifact: scaffold.artifact, request: scaffold.request, baseCommit: scaffold.baseCommit })
    const moved = movedContextOf({ ...context, changeReader: createCreationContext({ changes: [MOVED_CHANGE] }).changeReader })

    await getReview(PAGE_INPUT, moved)

    expect(moved.changeReader.findRevision).toHaveBeenCalledWith("/Users/dev/projects/storefront", "feature/gift-card-balance", "trunk")
    expect(moved.openRepository.mock.lastCall?.[2]).toBe("trunk")
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toMatchObject({ artifact: { commit: "2222222aaaaaaa" } })
  })
})
