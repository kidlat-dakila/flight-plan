import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405", verdict: "approve" as const, body: "" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.submit route", () => {
  it("delegates to the submit-review procedure", async () => {
    await expect(createCaller().review.submit(REQUEST)).resolves.toStrictEqual({ message: "Review submitted" })
  })

  it("maps an empty review to a BAD_REQUEST error with the reason", async () => {
    await expect(createCaller().review.submit({ ...REQUEST, verdict: "comment" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Write a summary or a comment before you submit.",
    })
  })

  it("maps a review target without a pull request to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.submit({ ...REQUEST, repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
