import { createMockProcedureContext } from "@/procedures/context"
import { requestReviewInputSchema } from "@/procedures/request-review/utils/schemas"
import { appRouter } from "@/server/trpc/router"

const REQUEST = {
  repositoryName: "storefront",
  targetId: "pr-416",
  configurationId: "standard",
  order: "foundations-first",
  customOrder: "",
  writer: { kind: "manual" },
} as const

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.request route", () => {
  it("delegates to the request-review procedure and returns what it could not do as data", async () => {
    await expect(createCaller().review.request(REQUEST)).resolves.toMatchObject({ kind: "unavailable" })
  })

  it("returns a rejection as data", async () => {
    await expect(createCaller().review.request({ ...REQUEST, order: "custom" })).resolves.toMatchObject({
      kind: "rejected",
      field: "customOrder",
    })
  })

  it("validates the request against an order Flight Plan does not offer", () => {
    expect(requestReviewInputSchema.safeParse({ ...REQUEST, order: "findings-first" }).success).toBe(false)
    expect(requestReviewInputSchema.safeParse(REQUEST).success).toBe(true)
  })

  it("maps a review target that already has a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.request({ ...REQUEST, targetId: "pr-412" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
