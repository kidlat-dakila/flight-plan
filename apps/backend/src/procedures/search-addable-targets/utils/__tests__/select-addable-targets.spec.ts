import { findAddableTarget, selectAddableTargets } from "@/procedures/search-addable-targets/utils/select-addable-targets"
import type { BranchTip, ReviewTarget as ForgeTarget } from "@flightplan/git-forge"

const tip = (name: string, updatedAt: string): BranchTip => ({ name, sha: `sha-${name}`, authorEmail: "x@acme.dev", updatedAt })

const openPullRequest = (number: number, headBranch: string, overrides: Partial<ForgeTarget> = {}): ForgeTarget => ({
  ref: { kind: "pr", number },
  title: `Pull request ${String(number)}`,
  author: "jonas",
  url: "",
  updatedAt: "2026-10-01T11:30:00.000Z",
  isDraft: false,
  headBranch,
  reason: "review-requested",
  ...overrides,
})

const BRANCH_TIPS = [
  tip("spike/returns", "2026-10-01T09:00:00.000Z"),
  tip("fix/webhook-retry", "2026-10-01T10:00:00.000Z"),
  tip("feature/held-stock", "2026-10-01T11:00:00.000Z"),
]

describe("selectAddableTargets", () => {
  it("offers each branch, as its open pull request when it has one, newest first", () => {
    const targets = selectAddableTargets({
      branchTips: BRANCH_TIPS,
      openPullRequests: [openPullRequest(409, "fix/webhook-retry"), openPullRequest(500, "feature/elsewhere")],
    })

    expect(targets).toStrictEqual([
      {
        kind: "pull-request",
        number: 409,
        title: "Pull request 409",
        branch: "fix/webhook-retry",
        author: "jonas",
        authorAvatarUrl: null,
        branchStatus: "no-review",
        isNew: false,
        updatedAt: new Date("2026-10-01T11:30:00.000Z"),
      },
      { kind: "branch", name: "feature/held-stock", branchStatus: "no-review", isNew: false, updatedAt: new Date("2026-10-01T11:00:00.000Z") },
      { kind: "branch", name: "spike/returns", branchStatus: "no-review", isNew: false, updatedAt: new Date("2026-10-01T09:00:00.000Z") },
    ])
  })

  it("marks a draft pull request as a draft", () => {
    const [target] = selectAddableTargets({
      branchTips: [tip("spike/returns", "2026-10-01T09:00:00.000Z")],
      openPullRequests: [openPullRequest(414, "spike/returns", { isDraft: true })],
    })

    expect(target).toMatchObject({ kind: "pull-request", number: 414, branchStatus: "draft" })
  })
})

describe("findAddableTarget", () => {
  const targets = selectAddableTargets({ branchTips: BRANCH_TIPS, openPullRequests: [openPullRequest(409, "fix/webhook-retry")] })

  it("finds a target by its id", () => {
    expect(findAddableTarget(targets, "branch-spike/returns")).toMatchObject({ kind: "branch", name: "spike/returns" })
    expect(findAddableTarget(targets, "pr-409")).toMatchObject({ kind: "pull-request", number: 409 })
  })

  it("finds the open pull request of a branch asked for by name", () => {
    expect(findAddableTarget(targets, "branch-fix/webhook-retry")).toMatchObject({ kind: "pull-request", number: 409 })
  })

  it("finds nothing for a target that is not offered", () => {
    expect(findAddableTarget(targets, "branch-gone")).toBeNull()
    expect(findAddableTarget(targets, "pr-1")).toBeNull()
  })
})
