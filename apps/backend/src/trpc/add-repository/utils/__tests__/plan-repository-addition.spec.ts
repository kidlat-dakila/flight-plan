import type { Repository } from "@/repository/repository"
import { planRepositoryAddition } from "@/trpc/add-repository/utils/plan-repository-addition"

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [],
}

describe("planRepositoryAddition", () => {
  it("accepts an absolute path and names the repository after its folder", () => {
    expect(planRepositoryAddition([storefront], " /work/ledger-api/ ")).toStrictEqual({
      kind: "accepted",
      repository: {
        name: "ledger-api",
        path: "/work/ledger-api",
        forge: "git",
        forgeSlug: null,
        problem: null,
        targets: [],
      },
    })
  })

  it("accepts a Windows path", () => {
    expect(planRepositoryAddition([], String.raw`C:\work\ledger-api`)).toMatchObject({
      kind: "accepted",
      repository: { name: "ledger-api" },
    })
  })

  it("rejects a relative path", () => {
    expect(planRepositoryAddition([], "projects/ledger-api")).toStrictEqual({
      kind: "rejected",
      message: "Enter the full path to a repository folder, for example /Users/you/projects/storefront.",
    })
  })

  it("rejects an empty path", () => {
    expect(planRepositoryAddition([], "   ")).toMatchObject({ kind: "rejected" })
  })

  it("rejects a path that is already on the list", () => {
    expect(planRepositoryAddition([storefront], "/work/storefront")).toStrictEqual({
      kind: "rejected",
      message: "/work/storefront is already on the list.",
    })
  })

  it("rejects a second repository with the same folder name", () => {
    expect(planRepositoryAddition([storefront], "/elsewhere/storefront")).toStrictEqual({
      kind: "rejected",
      message: "A repository named storefront is already on the list.",
    })
  })
})
