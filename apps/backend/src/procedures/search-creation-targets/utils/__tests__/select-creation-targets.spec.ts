import type { PullRequestTarget, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { selectCreationTargets, type TargetSearch } from "@/procedures/search-creation-targets/utils/select-creation-targets"
import type { BranchTip } from "@flightplan/git-forge"

const minutesBeforeNoon = (minutes: number): Date => new Date(Date.UTC(2026, 9, 1, 12, 0) - minutes * 60_000)

const pullRequest = (number: number, overrides: Partial<PullRequestTarget> = {}): PullRequestTarget => ({
  kind: "pull-request",
  number,
  title: `Change ${String(number)}`,
  branch: `feature/change-${String(number)}`,
  author: "lena",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: minutesBeforeNoon(number),
  ...overrides,
})

const tip = (name: string, minutesAgo: number): BranchTip => ({
  name,
  sha: "abc1234",
  authorEmail: "lena@acme.dev",
  updatedAt: minutesBeforeNoon(minutesAgo).toISOString(),
})

const search = (overrides: Partial<TargetSearch>): TargetSearch => ({
  targets: [],
  branchTips: [],
  viewerLogin: null,
  query: "",
  ...overrides,
})

const idsOf = (targets: readonly ReviewTarget[]): string[] => targets.map(targetIdOf)

describe("selectCreationTargets", () => {
  it("puts the viewer's open pull requests before everyone else's, each by latest update", () => {
    const targets = [
      pullRequest(40, { author: "@Teo" }),
      pullRequest(30, { author: "Lena" }),
      pullRequest(10, { author: "teo" }),
      pullRequest(20),
    ]

    expect(idsOf(selectCreationTargets(search({ targets, viewerLogin: "@lena" })))).toStrictEqual([
      "pr-20",
      "pr-30",
      "pr-10",
      "pr-40",
    ])
  })

  it("orders the pull requests by latest update alone when the forge does not say who the viewer is", () => {
    const targets = [pullRequest(30), pullRequest(10, { author: "teo" }), pullRequest(20)]

    expect(idsOf(selectCreationTargets(search({ targets })))).toStrictEqual(["pr-10", "pr-20", "pr-30"])
  })

  it("leaves out pull requests that are closed or merged", () => {
    const targets = [pullRequest(1, { branchStatus: "merged" }), pullRequest(2, { branchStatus: "closed" }), pullRequest(3, { branchStatus: "draft" })]

    expect(idsOf(selectCreationTargets(search({ targets })))).toStrictEqual(["pr-3"])
  })

  it("adds the two branches with the latest commits after the pull requests", () => {
    const branchTips = [tip("spike/old", 300), tip("spike/newest", 5), tip("spike/newer", 60)]

    expect(idsOf(selectCreationTargets(search({ targets: [pullRequest(7)], branchTips })))).toStrictEqual([
      "pr-7",
      "branch-spike/newest",
      "branch-spike/newer",
    ])
  })

  it("does not offer the branch of an open pull request a second time", () => {
    const branchTips = [tip("feature/change-7", 1), tip("spike/returns", 60)]

    expect(idsOf(selectCreationTargets(search({ targets: [pullRequest(7)], branchTips })))).toStrictEqual([
      "pr-7",
      "branch-spike/returns",
    ])
  })

  it("matches every word of the query against the title, the number and the branch, whatever the case", () => {
    const targets = [pullRequest(416, { title: "Show the gift card balance" }), pullRequest(412, { title: "Count held units" })]
    const branchTips = [tip("spike/gift-wrap", 5), tip("spike/returns", 1)]

    expect(idsOf(selectCreationTargets(search({ targets, branchTips, query: " GIFT " })))).toStrictEqual([
      "pr-416",
      "branch-spike/gift-wrap",
    ])
    expect(idsOf(selectCreationTargets(search({ targets, branchTips, query: "#412" })))).toStrictEqual(["pr-412"])
    expect(idsOf(selectCreationTargets(search({ targets, branchTips, query: "gift returns" })))).toStrictEqual([])
  })

  it("offers at most eight pull requests", () => {
    const targets = Array.from({ length: 12 }, (_unused, position) => pullRequest(position + 1))

    expect(selectCreationTargets(search({ targets }))).toHaveLength(8)
  })
})
