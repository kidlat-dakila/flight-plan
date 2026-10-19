import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = {
  repositoryName: "storefront",
  targetId: "pr-412",
  mode: "update",
  configurationId: "standard",
  order: "foundations-first",
  customOrder: "",
  writer: { kind: "none" },
} as const

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-12T12:00:00.000Z")))

describe("review.rebuild route", () => {
  it("delegates to the rebuild-review procedure and returns what it could not do as data", async () => {
    await expect(createCaller().review.rebuild(REQUEST)).resolves.toMatchObject({ kind: "unavailable" })
  })

  it("returns a rejection as data", async () => {
    await expect(createCaller().review.rebuild({ ...REQUEST, order: "custom" })).resolves.toMatchObject({
      kind: "rejected",
      field: "customOrder",
    })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.rebuild({ ...REQUEST, targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
