import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.creationForm route", () => {
  it("delegates to the get-creation-form procedure", async () => {
    await expect(createCaller().review.creationForm({ repositoryName: "storefront" })).resolves.toMatchObject({
      title: "Create a Flight Plan",
      target: { label: "Pull request or branch" },
    })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    await expect(createCaller().review.creationForm({ repositoryName: "gone" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
