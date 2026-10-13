import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const DONE = { message: null }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.resolveThread route", () => {
  it("delegates to the resolve-thread procedure", async () => {
    await expect(createCaller().review.resolveThread({ ...DISCUSSED_KEY, threadId: "thread-1", isResolved: true })).resolves.toStrictEqual(DONE)
  })

  it("maps a branch to a NOT_FOUND error", async () => {
    await expect(createCaller().review.resolveThread({ ...BRANCH_KEY, threadId: "thread-1", isResolved: true })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
