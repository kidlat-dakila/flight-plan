import { addComment } from "@/procedures/add-comment"
import { createMockProcedureContext } from "@/procedures/context"
import { submitReview } from "@/procedures/submit-review"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("submitReview", () => {
  it("stores the review and sends the pending comments", async () => {
    const context = createContext()
    await addComment({ ...KEY, threadId: null, location: null, body: "One thing." }, context)

    await expect(submitReview({ ...KEY, verdict: "approve", body: "" }, context)).resolves.toStrictEqual({
      kind: "submitted",
      message: "Review submitted",
    })
    await expect(context.reviewStore.readDiscussion(KEY)).resolves.toMatchObject({
      threads: [{ comments: [{ isPending: false }] }],
      reviews: [{ verdict: "approve" }],
    })
  })

  it("says so when there is nothing to submit", async () => {
    await expect(submitReview({ ...KEY, verdict: "comment", body: "" }, createContext())).resolves.toMatchObject({ kind: "empty" })
  })

  it("is unavailable for a branch without a pull request", async () => {
    await expect(
      submitReview({ repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web", verdict: "approve", body: "" }, createContext()),
    ).resolves.toMatchObject({ kind: "unavailable" })
  })
})
