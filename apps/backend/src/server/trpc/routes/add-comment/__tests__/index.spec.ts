import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405", threadId: null, location: null, body: "Looks right." }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.addComment route", () => {
  it("delegates to the add-comment procedure", async () => {
    await expect(createCaller().review.addComment(REQUEST)).resolves.toStrictEqual({ threadId: "thread-1" })
  })

  it("maps a thread it cannot find to a NOT_FOUND error", async () => {
    await expect(createCaller().review.addComment({ ...REQUEST, threadId: "thread-9" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a comment with no text", async () => {
    await expect(createCaller().review.addComment({ ...REQUEST, body: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
