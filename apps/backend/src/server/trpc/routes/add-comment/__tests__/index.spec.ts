import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const ADDED_LINE = { path: "src/cart/subtotal.ts", side: "new" as const, startLine: 7, endLine: 7 }
const DONE = { message: null }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.addComment route", () => {
  it("delegates to the add-comment procedure", async () => {
    await expect(createCaller().review.addComment({ ...KEY, position: ADDED_LINE, body: "Looks right." })).resolves.toStrictEqual(DONE)
  })

  it("maps a refusal to a BAD_REQUEST error with the reason", async () => {
    await expect(
      createCaller().review.addComment({ ...KEY, position: { ...ADDED_LINE, startLine: 1, endLine: 1 }, body: "Unrelated." }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "That line is not part of this pull request's changes, so the code host cannot hold a comment on it.",
    })
  })

  it("maps a review target without a pull request to a NOT_FOUND error", async () => {
    await expect(createCaller().review.addComment({ ...BRANCH_KEY, position: null, body: "Hello" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a comment with no text", async () => {
    await expect(createCaller().review.addComment({ ...KEY, position: null, body: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
