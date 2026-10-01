import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405", path: "src/cart/subtotal.ts", lineStart: 6, lineEnd: 6 }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.codeReference route", () => {
  it("delegates to the build-code-reference procedure", async () => {
    await expect(createCaller().review.codeReference(REQUEST)).resolves.toMatchObject({
      reference: "storefront@c81e220:src/cart/subtotal.ts#L6",
    })
  })

  it("maps a file the review does not cite to a NOT_FOUND error", async () => {
    await expect(createCaller().review.codeReference({ ...REQUEST, path: "src/gone.ts" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a line number below one", async () => {
    await expect(createCaller().review.codeReference({ ...REQUEST, lineStart: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
