import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.searchBaseBranches route", () => {
  it("searches the branches of the review's repository by its name", async () => {
    await expect(createCaller().review.searchBaseBranches({ repositoryName: "storefront", query: "develop" })).resolves.toMatchObject({
      options: [{ id: "develop", label: "develop" }],
      message: null,
      detectedBranch: "main",
    })
  })

  it("offers the latest branches for an empty query", async () => {
    await expect(createCaller().review.searchBaseBranches({ repositoryName: "storefront", query: "" })).resolves.toMatchObject({
      options: [{ id: "main" }, { id: "feature/held-stock" }, { id: "develop" }, { id: "release/2026.10" }, { id: "fix/rounding" }],
    })
  })

  it("says so for a repository Flight Plan does not list", async () => {
    await expect(createCaller().review.searchBaseBranches({ repositoryName: "gone", query: "" })).resolves.toStrictEqual({
      options: [],
      message: "This repository is not listed in Flight Plan.",
      detectedBranch: null,
    })
  })
})
