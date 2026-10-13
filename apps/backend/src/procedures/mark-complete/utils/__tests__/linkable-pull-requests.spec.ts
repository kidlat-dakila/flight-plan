import type { PullRequestTarget } from "@/procedures/list-repositories/utils/repository"
import { selectLinkablePullRequests } from "@/procedures/mark-complete/utils/linkable-pull-requests"

const pullRequest = (number: number, overrides: Partial<PullRequestTarget> = {}): PullRequestTarget => ({
  kind: "pull-request",
  number,
  title: `Pull request ${String(number)}`,
  branch: `feature/${String(number)}`,
  author: "lena",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date(`2026-10-0${String(number)}T12:00:00.000Z`),
  ...overrides,
})

const numbersOf = (pullRequests: readonly PullRequestTarget[]): readonly number[] => pullRequests.map((target) => target.number)

describe("selectLinkablePullRequests", () => {
  it("offers the viewer's pull requests that have no Flight Plan, the one of the branch first, then the latest", () => {
    const pullRequests = [
      pullRequest(1, { branch: "spike/returns" }),
      pullRequest(2),
      pullRequest(3),
      pullRequest(4, { author: "teo" }),
      pullRequest(5),
    ]

    expect(numbersOf(selectLinkablePullRequests({
      pullRequests,
      branchName: "spike/returns",
      viewerLogin: "@Lena",
      takenTargetIds: ["pr-5"],
    }))).toStrictEqual([1, 3, 2])
  })

  it("offers everyone's pull requests when the signed-in user is not known", () => {
    expect(numbersOf(selectLinkablePullRequests({
      pullRequests: [pullRequest(1), pullRequest(2, { author: "teo" })],
      branchName: "spike/returns",
      viewerLogin: null,
      takenTargetIds: [],
    }))).toStrictEqual([2, 1])
  })
})
