import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

const EDIT = { kind: "remove-file" as const, path: "src/gone.ts" }

describe("review.editWalkthrough route", () => {
  it("delegates to the edit-walkthrough procedure and returns a rejection as data", async () => {
    await expect(
      createCaller().review.editWalkthrough({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", edit: EDIT }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "This file is no longer in the Code Walkthrough." })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.editWalkthrough({ repositoryName: "storefront", targetId: "pr-416", segmentId: "stock-check", edit: EDIT }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
