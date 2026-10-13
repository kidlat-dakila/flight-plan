import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405", destination: "description" as const }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.publish route", () => {
  it("delegates to the publish-artifact procedure", async () => {
    await expect(createCaller().review.publish(REQUEST)).resolves.toStrictEqual({ message: "Attached to the pull request description" })
  })

  it("maps a review without an artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.publish({ ...REQUEST, targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
