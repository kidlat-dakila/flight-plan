import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.searchReviewers route", () => {
  it("delegates to the search-reviewers procedure", async () => {
    await expect(createCaller().review.searchReviewers({ ...DISCUSSED_KEY, query: "le" })).resolves.toMatchObject([{ login: "lena" }])
  })

  it("maps a branch to a NOT_FOUND error", async () => {
    await expect(createCaller().review.searchReviewers({ ...BRANCH_KEY, query: "" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
