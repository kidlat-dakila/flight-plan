import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.discardComment route", () => {
  it("maps a pending comment it cannot find to a NOT_FOUND error", async () => {
    await expect(createCaller().review.discardComment({ ...KEY, commentId: "gone" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
