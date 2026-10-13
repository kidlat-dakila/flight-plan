import { addComment } from "@/procedures/add-comment"
import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { submitReview } from "@/procedures/submit-review"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const SUBTOTAL_PATH = "src/cart/subtotal.ts"
const ADDED_LINE = { path: SUBTOTAL_PATH, side: "new" as const, startLine: 7, endLine: 7 }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readPage = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)
  if (page?.kind !== "artifact") throw new Error("The sample review is not written.")
  return page
}

describe("submitReview", () => {
  it("sends the pending comments with the verdict, and keeps none of them pending", async () => {
    const context = createContext()
    await addComment({ ...KEY, position: ADDED_LINE, body: "One thing." }, context)

    await expect(submitReview({ ...KEY, verdict: "approve", body: "Good." }, context)).resolves.toStrictEqual({ kind: "done" })

    const page = await readPage(context)
    expect(page.conversation).toMatchObject({ entries: [{ verdict: "approve", author: { name: "you" } }] })
    expect(page.segments.flatMap((segment) => segment.walkthrough.files).flatMap((file) => file.threads)).toMatchObject([
      { side: "new", lineLabel: "7", comments: [{ pendingLabel: null }] },
    ])
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toStrictEqual([])
  })

  it("refuses a review with nothing in it", async () => {
    await expect(submitReview({ ...KEY, verdict: "comment", body: "" }, createContext())).resolves.toStrictEqual({
      kind: "refused",
      message: "Write a summary or a comment before you submit.",
    })
  })

  it("refuses while a pending comment was written against an earlier commit, and keeps it", async () => {
    const context = createContext()
    const stale = { id: "c1", position: ADDED_LINE, body: "Old.", createdAt: new Date("2026-09-30T12:00:00.000Z"), commit: "0000000" }
    await context.reviewStore.writePendingComments(KEY, [stale])

    await expect(submitReview({ ...KEY, verdict: "approve", body: "" }, context)).resolves.toMatchObject({ kind: "refused" })
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toStrictEqual([stale])
  })

  it("reports nothing for a branch without a pull request", async () => {
    await expect(submitReview({ ...BRANCH_KEY, verdict: "approve", body: "" }, createContext())).resolves.toBeNull()
  })
})
