import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.fileCode route", () => {
  it("delegates to the get-file-code procedure", async () => {
    await expect(
      createCaller().review.fileCode({ repositoryName: "storefront", targetId: "pr-405", path: "src/cart/subtotal.ts" }),
    ).resolves.toMatchObject({ path: "src/cart/subtotal.ts" })
  })

  it("maps a file that cannot be read to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.fileCode({ repositoryName: "storefront", targetId: "pr-405", path: "src/gone.ts" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
