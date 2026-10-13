import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const DONE = { message: null }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.requestReviewer route", () => {
  it("delegates to the request-reviewer procedure", async () => {
    await expect(createCaller().review.requestReviewer({ ...DISCUSSED_KEY, login: "lena" })).resolves.toStrictEqual(DONE)
  })

  it("maps a branch to a NOT_FOUND error, and rejects an empty login", async () => {
    await expect(createCaller().review.requestReviewer({ ...BRANCH_KEY, login: "lena" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(createCaller().review.requestReviewer({ ...DISCUSSED_KEY, login: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
