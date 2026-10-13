import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-416", artifactUrl: "https://claude.ai/artifact/abc" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.importForm route", () => {
  it("delegates to the get-import-form procedure", async () => {
    await expect(createCaller().review.importForm(REQUEST)).resolves.toMatchObject({ heading: "Download a Flight Plan", startsAtOnce: true })
  })

  it("returns a refusal as a form with nothing to submit", async () => {
    await expect(createCaller().review.importForm({ ...REQUEST, artifactUrl: "https://example.com" })).resolves.toMatchObject({ submitLabel: null })
  })
})
