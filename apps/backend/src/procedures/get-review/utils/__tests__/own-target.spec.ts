import { isOwnTarget, type OwnershipFacts } from "@/procedures/get-review/utils/own-target"
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

const UNKNOWN: OwnershipFacts = { viewerLogin: null, selfAuthorId: null, branchAuthorEmail: null }

describe("isOwnTarget", () => {
  it("takes a pull request the signed-in user wrote as their own, whatever the case or the handle prefix", () => {
    expect(isOwnTarget(pullRequest, { ...UNKNOWN, viewerLogin: "@mira" })).toBe(true)
    expect(isOwnTarget(pullRequest, { ...UNKNOWN, viewerLogin: "teo" })).toBe(false)
  })

  it("takes a pull request as someone else's when the signed-in user is not known", () => {
    expect(isOwnTarget(pullRequest, UNKNOWN)).toBe(false)
  })

  it("takes a branch as the viewer's own when its first commit is by the viewer, whatever the case", () => {
    expect(isOwnTarget(branch, { ...UNKNOWN, selfAuthorId: "Mira@Acme.test", branchAuthorEmail: "mira@acme.test" })).toBe(true)
  })

  it("takes a branch as someone else's when its first commit is by another author", () => {
    expect(isOwnTarget(branch, { ...UNKNOWN, selfAuthorId: "mira@acme.test", branchAuthorEmail: "teo@acme.test" })).toBe(false)
  })

  it("takes a branch as the viewer's own when either its first author or the viewer is not known", () => {
    expect(isOwnTarget(branch, UNKNOWN)).toBe(true)
    expect(isOwnTarget(branch, { ...UNKNOWN, selfAuthorId: "mira@acme.test" })).toBe(true)
    expect(isOwnTarget(branch, { ...UNKNOWN, branchAuthorEmail: "teo@acme.test" })).toBe(true)
  })
})
