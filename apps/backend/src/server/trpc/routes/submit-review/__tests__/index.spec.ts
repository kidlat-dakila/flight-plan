import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }
const DONE = { message: null }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.submit route", () => {
  it("delegates to the submit-review procedure", async () => {
    await expect(createCaller().review.submit({ ...KEY, verdict: "approve", body: "" })).resolves.toStrictEqual(DONE)
  })

  it("maps an empty review to a BAD_REQUEST error with the reason", async () => {
    await expect(createCaller().review.submit({ ...KEY, verdict: "comment", body: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Write a summary or a comment before you submit.",
    })
  })

  it("maps a review target without a pull request to a NOT_FOUND error", async () => {
    await expect(createCaller().review.submit({ ...BRANCH_KEY, verdict: "approve", body: "" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
