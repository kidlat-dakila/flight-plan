import { lookUpReviewTarget } from "@/procedures/get-conversation/utils/review-target"

const REPOSITORIES = [{ name: "storefront", path: "/Users/dev/projects/storefront" }]

describe("lookUpReviewTarget", () => {
  it("finds the folder of a pull request or a branch in a registered repository", () => {
    expect(lookUpReviewTarget({ repositoryName: "storefront", targetId: "pr-412" }, REPOSITORIES)).toStrictEqual({
      kind: "found",
      workingPath: "/Users/dev/projects/storefront",
    })
    expect(lookUpReviewTarget({ repositoryName: "storefront", targetId: "branch-feature/web" }, REPOSITORIES)).toMatchObject({
      kind: "found",
    })
  })

  it("rejects a target id that names neither a pull request nor a branch", () => {
    expect(lookUpReviewTarget({ repositoryName: "storefront", targetId: "412" }, REPOSITORIES)).toStrictEqual({
      kind: "rejected",
      message: "\"412\" is not a review target. Use pr-<number> for a pull request or branch-<name> for a branch.",
    })
  })

  it("rejects a repository Flight Plan does not follow", () => {
    expect(lookUpReviewTarget({ repositoryName: "billing", targetId: "pr-1" }, REPOSITORIES)).toStrictEqual({
      kind: "rejected",
      message: "Flight Plan has no repository named \"billing\". It follows: storefront.",
    })
  })

  it("says when Flight Plan follows no repositories at all", () => {
    expect(lookUpReviewTarget({ repositoryName: "billing", targetId: "pr-1" }, [])).toStrictEqual({
      kind: "rejected",
      message: "Flight Plan has no repository named \"billing\". It follows no repositories yet.",
    })
  })
})
