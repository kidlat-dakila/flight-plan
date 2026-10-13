import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.cardBlocks route", () => {
  it("delegates to the list-card-blocks procedure", async () => {
    await expect(
      createCaller().review.cardBlocks({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", path: "src/inventory/stock-level.ts" }),
    ).resolves.toMatchObject({ path: "src/inventory/stock-level.ts", message: null })
  })

  it("maps a file that cannot be read to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.cardBlocks({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", path: "src/missing.ts" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
