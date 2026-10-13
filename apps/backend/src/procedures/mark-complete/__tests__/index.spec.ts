import { createMockProcedureContext } from "@/procedures/context"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { markComplete } from "@/procedures/mark-complete"

const DRAFTING_KEY = { repositoryName: "storefront", targetId: "pr-409" }
const UNWRITTEN_KEY = { repositoryName: "storefront", targetId: "pr-416" }
const BRANCH_KEY = { repositoryName: "storefront", targetId: "branch-spike/returns" }
const NOW = new Date("2026-10-01T12:00:00.000Z")

const AUTHOR_REQUEST: ReviewRequest = {
  preset: "standard",
  order: "foundations-first",
  customOrder: null,
  writer: { kind: "author", start: "scaffold" },
  requestedAt: NOW,
}

const createContext = () => createMockProcedureContext(NOW)

const createContextWithBranchFlightPlan = async () => {
  const context = createContext()
  const artifact = await context.reviewStore.findArtifact(DRAFTING_KEY)
  if (artifact === null) throw new Error("The sample artifact is missing.")
  await context.reviewStore.writeScaffold(BRANCH_KEY, {
    artifact: { ...artifact, title: "spike/returns", status: "authoring" },
    request: AUTHOR_REQUEST,
    baseCommit: "0000000",
  })
  return context
}

describe("markComplete", () => {
  it("makes the review artifact complete where it is when no pull request is chosen", async () => {
    const context = createContext()

    await expect(markComplete({ ...DRAFTING_KEY, pullRequestTargetId: null }, context)).resolves.toStrictEqual({
      message: "Flight Plan marked as complete",
      targetId: "pr-409",
    })
    await expect(context.reviewStore.findArtifact(DRAFTING_KEY)).resolves.toMatchObject({ status: "complete" })
  })

  it("moves a branch's Flight Plan to the chosen pull request, under the pull request's title", async () => {
    const context = await createContextWithBranchFlightPlan()

    await expect(markComplete({ ...BRANCH_KEY, pullRequestTargetId: "pr-416" }, context)).resolves.toStrictEqual({
      message: "Flight Plan marked as complete and moved to pull request #416",
      targetId: "pr-416",
    })
    await expect(context.reviewStore.findArtifact(BRANCH_KEY)).resolves.toBeNull()
    await expect(context.reviewStore.findArtifact(UNWRITTEN_KEY)).resolves.toMatchObject({
      status: "complete",
      title: "Show the gift card balance at checkout",
    })
    await expect(context.reviewStore.findRequest(UNWRITTEN_KEY)).resolves.toMatchObject({ writer: { kind: "author" } })
  })

  it("moves nothing to a pull request that already has a Flight Plan, or from a pull request", async () => {
    const context = await createContextWithBranchFlightPlan()

    await expect(markComplete({ ...BRANCH_KEY, pullRequestTargetId: "pr-409" }, context)).resolves.toBeNull()
    await expect(markComplete({ ...DRAFTING_KEY, pullRequestTargetId: "pr-416" }, context)).resolves.toBeNull()
    await expect(context.reviewStore.findArtifact(BRANCH_KEY)).resolves.toMatchObject({ status: "authoring" })
  })

  it("reports nothing for a review target without a review artifact", async () => {
    await expect(markComplete({ ...UNWRITTEN_KEY, pullRequestTargetId: null }, createContext())).resolves.toBeNull()
  })
})
