import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-13T12:00:00.000Z")))

describe("review.generateSection route", () => {
  it("delegates to the generate-section procedure and returns what it could not do as data", async () => {
    await expect(createCaller().review.generateSection({ repositoryName: "storefront", targetId: "pr-412", section: "traceDiagram" })).resolves.toStrictEqual({
      kind: "unavailable",
      message: "The Trace Diagram is already generated.",
    })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.generateSection({ repositoryName: "storefront", targetId: "pr-416", section: "traceDiagram" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
