import { toBranchTargets, toPullRequestTargets } from "@/procedures/list-repositories/utils/build-review-targets"
import type { ForgePullRequest, ForgeSnapshot } from "@/procedures/list-repositories/utils/forge-pull-request"
import { startTargetMemory, withDismissedTarget, type TargetMemory } from "@/procedures/list-repositories/utils/target-memory"

const BASELINE = new Date("2026-10-01T10:00:00.000Z")
const AFTER_BASELINE = new Date("2026-10-01T11:00:00.000Z")
const BEFORE_BASELINE = new Date("2026-10-01T09:00:00.000Z")

const MEMORY = startTargetMemory(BASELINE)

const pullRequest = (number: number, authorLogin: string, overrides: Partial<ForgePullRequest> = {}): ForgePullRequest => ({
  number,
  title: `Pull request ${String(number)}`,
  headBranch: `feature/${String(number)}`,
  state: "open",
  isDraft: false,
  author: { login: authorLogin, avatarUrl: `https://avatars.test/${authorLogin}.png` },
  createdAt: AFTER_BASELINE,
  updatedAt: AFTER_BASELINE,
  requestedReviewerLogins: [],
  discussionActivity: [],
  commitDates: [AFTER_BASELINE],
  ...overrides,
})

const snapshotOf = (...pullRequests: readonly ForgePullRequest[]): ForgeSnapshot => ({ viewerLogin: "dev", pullRequests })

describe("toPullRequestTargets", () => {
  it("keeps the pull requests of tracked authors and of the viewer", () => {
    const snapshot = snapshotOf(pullRequest(1, "mira"), pullRequest(2, "dev"), pullRequest(3, "stranger"))

    const targets = toPullRequestTargets(snapshot, ["@Mira"], MEMORY)

    expect(targets.map((target) => target.number)).toStrictEqual([1, 2])
  })

  it("describes a pull request for the index", () => {
    const [target] = toPullRequestTargets(snapshotOf(pullRequest(1, "mira")), ["mira"], MEMORY)

    expect(target).toStrictEqual({
      kind: "pull-request",
      number: 1,
      title: "Pull request 1",
      branch: "feature/1",
      author: "mira",
      authorAvatarUrl: "https://avatars.test/mira.png",
      branchStatus: "no-review",
      isNew: true,
      updatedAt: AFTER_BASELINE,
    })
  })

  it("does not mark a pull request that started before the baseline", () => {
    const snapshot = snapshotOf(pullRequest(1, "mira", { createdAt: BEFORE_BASELINE }))

    expect(toPullRequestTargets(snapshot, ["mira"], MEMORY)).toMatchObject([{ isNew: false }])
  })

  it("does not mark a dismissed pull request", () => {
    const memory: TargetMemory = withDismissedTarget(MEMORY, "pr-1")

    expect(toPullRequestTargets(snapshotOf(pullRequest(1, "mira")), ["mira"], memory)).toMatchObject([{ isNew: false }])
  })

  it("takes the branch status from the viewer's side of the pull request", () => {
    const reviewed = pullRequest(1, "mira", { discussionActivity: [{ login: "dev", at: AFTER_BASELINE }] })

    expect(toPullRequestTargets(snapshotOf(reviewed), ["mira"], MEMORY)).toMatchObject([{ branchStatus: "stale" }])
  })
})

describe("toBranchTargets", () => {
  const branch = {
    name: "feature/a",
    tipDate: AFTER_BASELINE,
    startedAt: AFTER_BASELINE,
  }

  it("describes a branch with no review as new", () => {
    expect(toBranchTargets([branch], MEMORY)).toStrictEqual([
      { kind: "branch", name: "feature/a", branchStatus: "no-review", isNew: true, updatedAt: AFTER_BASELINE },
    ])
  })

  it("does not mark a branch that started before the baseline", () => {
    expect(toBranchTargets([{ ...branch, startedAt: BEFORE_BASELINE }], MEMORY)).toMatchObject([{ isNew: false }])
  })

  it("does not mark a dismissed branch", () => {
    expect(toBranchTargets([branch], withDismissedTarget(MEMORY, "branch-feature/a"))).toMatchObject([{ isNew: false }])
  })

  it("gives every branch the status no review, whatever its commits", () => {
    const newerBranch = { ...branch, name: "feature/b", tipDate: new Date("2026-10-02T10:00:00.000Z") }

    expect(toBranchTargets([branch, newerBranch], MEMORY).map((target) => target.branchStatus)).toStrictEqual([
      "no-review",
      "no-review",
    ])
  })
})
