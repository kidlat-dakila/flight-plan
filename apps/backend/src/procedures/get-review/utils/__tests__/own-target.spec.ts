import { isOwnTarget } from "@/procedures/get-review/utils/own-target"
import type { BranchTarget, PullRequestTarget } from "@/procedures/list-repositories/utils/repository"

const UPDATED_AT = new Date("2026-10-01T12:00:00.000Z")

const pullRequest: PullRequestTarget = {
  kind: "pull-request",
  number: 412,
  title: "Count held units",
  branch: "feature/held-stock",
  author: "Mira",
  authorAvatarUrl: null,
  branchStatus: "draft",
  isNew: false,
  updatedAt: UPDATED_AT,
}

const branch: BranchTarget = { kind: "branch", name: "spike/returns", branchStatus: "no-review", isNew: false, updatedAt: UPDATED_AT }

describe("isOwnTarget", () => {
  it("takes a pull request the signed-in user wrote as their own, whatever the case or the handle prefix", () => {
    expect(isOwnTarget(pullRequest, "@mira")).toBe(true)
    expect(isOwnTarget(pullRequest, "teo")).toBe(false)
  })

  it("takes a pull request as someone else's when the signed-in user is not known", () => {
    expect(isOwnTarget(pullRequest, null)).toBe(false)
  })

  it("takes a branch with no pull request as the viewer's own", () => {
    expect(isOwnTarget(branch, null)).toBe(true)
  })
})
