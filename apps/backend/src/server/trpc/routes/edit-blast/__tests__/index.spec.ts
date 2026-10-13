import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.editBlast route", () => {
  it("delegates to the edit-blast procedure and returns a rejection as data", async () => {
    await expect(
      createCaller().review.editBlast({ repositoryName: "storefront", targetId: "pr-412", path: "src/gone.ts", impactType: "unaffected", impactReason: "" }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "This file is no longer in the Blast Diagram." })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.editBlast({ repositoryName: "storefront", targetId: "pr-416", path: "src/gone.ts", impactType: "unaffected", impactReason: "" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
