import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const NO_DIAGRAM_REQUEST = { levels: null, isShowingData: null, isShowingAssumed: null }

const REQUEST = {
  repositoryName: "storefront",
  targetId: "pr-405",
  filterKeys: null,
  isShowingReviewed: false,
  journey: NO_DIAGRAM_REQUEST,
  blast: NO_DIAGRAM_REQUEST,
}

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.get route", () => {
  it("delegates to the get-review procedure and returns a page that passes its schema", async () => {
    await expect(createCaller().review.get(REQUEST)).resolves.toMatchObject({ kind: "artifact" })
    await expect(createCaller().review.get({ ...REQUEST, targetId: "pr-412" })).resolves.toMatchObject({ kind: "artifact" })
    await expect(createCaller().review.get({ ...REQUEST, targetId: "pr-409" })).resolves.toMatchObject({ kind: "artifact" })
  })

  it("maps a review target it cannot find to a NOT_FOUND error", async () => {
    await expect(createCaller().review.get({ ...REQUEST, targetId: "pr-1" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a request with a negative number of levels", async () => {
    await expect(
      createCaller().review.get({ ...REQUEST, journey: { ...NO_DIAGRAM_REQUEST, levels: -1 } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
