import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const DONE = { message: null }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.replyToThread route", () => {
  it("delegates to the reply-to-thread procedure", async () => {
    await expect(createCaller().review.replyToThread({ ...DISCUSSED_KEY, threadId: "thread-1", body: "Agreed." })).resolves.toStrictEqual(DONE)
  })

  it("maps a thread that is gone to a BAD_REQUEST error, and a branch to a NOT_FOUND error", async () => {
    await expect(createCaller().review.replyToThread({ ...DISCUSSED_KEY, threadId: "thread-9", body: "Hello" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This comment thread is no longer there.",
    })
    await expect(createCaller().review.replyToThread({ ...BRANCH_KEY, threadId: "thread-1", body: "Hello" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
