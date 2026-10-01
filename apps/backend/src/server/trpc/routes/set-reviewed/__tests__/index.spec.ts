import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.setReviewed route", () => {
  it("delegates to the set-reviewed procedure", async () => {
    await expect(
      createCaller().review.setReviewed({ ...KEY, subject: { kind: "waypoint", id: "subtotal" }, isReviewed: true }),
    ).resolves.toStrictEqual({ isReviewed: true })
  })

  it("maps a waypoint it cannot find to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.setReviewed({ ...KEY, subject: { kind: "waypoint", id: "gone" }, isReviewed: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
