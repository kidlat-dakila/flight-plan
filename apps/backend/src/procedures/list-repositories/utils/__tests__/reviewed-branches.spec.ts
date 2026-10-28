import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { unlistedBranchNamesOf, withReviewedBranches } from "@/procedures/list-repositories/utils/reviewed-branches"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const REPOSITORY: Repository = {
  name: "storefront",
  path: "/work/storefront",
  baseBranch: null,
  forge: "git",
  forgeSlug: null,
  problem: null,
  targets: [{ kind: "branch", name: "feature/listed", branchStatus: "no-review", isNew: false, updatedAt: NOW }],
}

describe("unlistedBranchNamesOf", () => {
  it("names the reviewed branches the repository does not list, and no pull requests", () => {
    const reviewedTargetIds = ["branch-feature/listed", "branch-spike/returns", "pr-7", "branch-"]

    expect(unlistedBranchNamesOf(REPOSITORY, reviewedTargetIds)).toStrictEqual(["spike/returns"])
  })
})

describe("withReviewedBranches", () => {
  it("adds each reviewed branch as a review target dated by when its Flight Plan was made", () => {
    const requestedAt = new Date("2026-10-01T10:00:00.000Z")

    expect(withReviewedBranches(REPOSITORY, [{ name: "spike/returns", requestedAt }]).targets).toStrictEqual([
      ...REPOSITORY.targets,
      { kind: "branch", name: "spike/returns", branchStatus: "no-review", isNew: false, updatedAt: requestedAt },
    ])
  })

  it("returns the repository as it is when no branch is added", () => {
    expect(withReviewedBranches(REPOSITORY, [])).toBe(REPOSITORY)
  })
})
