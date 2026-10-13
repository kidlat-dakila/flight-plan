import { addComment } from "@/procedures/add-comment"
import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const SUBTOTAL_PATH = "src/cart/subtotal.ts"
const ADDED_LINE = { path: SUBTOTAL_PATH, side: "new" as const, startLine: 7, endLine: 7 }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readConversation = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)
  return page?.kind === "artifact" ? page.conversation : null
}

describe("addComment", () => {
  it("keeps a comment on a line as pending, written against the Flight Plan's commit", async () => {
    const context = createContext()

    await expect(addComment({ ...KEY, position: ADDED_LINE, body: "Round here?" }, context)).resolves.toStrictEqual({ kind: "done" })
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toMatchObject([
      { position: ADDED_LINE, body: "Round here?", commit: "c81e220" },
    ])
  })

  it("keeps a comment on a removed line and on a range of lines", async () => {
    const context = createContext()
    const removedLine = { path: SUBTOTAL_PATH, side: "old" as const, startLine: 7, endLine: 7 }
    const range = { path: SUBTOTAL_PATH, side: "new" as const, startLine: 10, endLine: 12 }

    await addComment({ ...KEY, position: removedLine, body: "Why drop the rounding?" }, context)
    await addComment({ ...KEY, position: range, body: "This is the new rounding." }, context)

    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toMatchObject([{ position: removedLine }, { position: range }])
  })

  it("refuses a line that is not part of the change, and keeps nothing", async () => {
    const context = createContext()

    await expect(
      addComment({ ...KEY, position: { ...ADDED_LINE, startLine: 1, endLine: 1 }, body: "Unrelated." }, context),
    ).resolves.toMatchObject({ kind: "refused" })
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toStrictEqual([])
  })

  it("posts a comment on the pull request as a whole right away", async () => {
    const context = createContext()

    await expect(addComment({ ...KEY, position: null, body: "Thanks for this." }, context)).resolves.toStrictEqual({ kind: "done" })
    await expect(readConversation(context)).resolves.toMatchObject({ entries: [{ author: { name: "you" }, pendingLabel: null }] })
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toStrictEqual([])
  })

  it("reports nothing for a review target it does not know or a branch", async () => {
    await expect(addComment({ repositoryName: "gone", targetId: "pr-1", position: null, body: "Hello" }, createContext())).resolves.toBeNull()
    await expect(addComment({ ...BRANCH_KEY, position: null, body: "Hello" }, createContext())).resolves.toBeNull()
  })
})
