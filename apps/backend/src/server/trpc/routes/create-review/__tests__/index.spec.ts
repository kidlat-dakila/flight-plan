import { createMockProcedureContext } from "@/procedures/context"
import { createCreationContext, KEY } from "@/procedures/get-review/__tests__/creation-harness"
import { appRouter } from "@/server/trpc/router"

describe("review.create route", () => {
  it("delegates to the create-review procedure and says the review artifact was created", async () => {
    const context = createCreationContext()

    await expect(appRouter.createCaller(context).review.create({ ...KEY, baseBranch: "main" })).resolves.toStrictEqual({ kind: "created" })
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toMatchObject({ baseBranch: "main" })
  })

  it("returns a refusal as data when the review already has a review artifact", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date("2026-10-12T12:00:00.000Z")))

    await expect(caller.review.create({ repositoryName: "storefront", targetId: "pr-412", baseBranch: "main" })).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This review already has a review artifact.",
    })
  })

  it("rejects an empty compare branch", async () => {
    const caller = appRouter.createCaller(createCreationContext())

    await expect(caller.review.create({ ...KEY, baseBranch: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
