import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { buildTargetSuggestions } from "@/procedures/search-creation-targets/utils/build-target-suggestions"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const PULL_REQUEST: ReviewTarget = {
  kind: "pull-request",
  number: 416,
  title: "Show the gift card balance at checkout",
  branch: "feature/gift-card-balance",
  author: "lena",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: NOW,
}

const BRANCH: ReviewTarget = {
  kind: "branch",
  name: "spike/returns",
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date("2026-10-01T10:00:00.000Z"),
}

describe("buildTargetSuggestions", () => {
  it("describes a pull request by its number and branch, and a branch by its latest commit", () => {
    const offered = [{ target: PULL_REQUEST, hasFlightPlan: false }, { target: BRANCH, hasFlightPlan: false }]

    expect(buildTargetSuggestions(offered, "", NOW)).toStrictEqual({
      options: [
        {
          id: "pr-416",
          label: "Show the gift card balance at checkout",
          detail: "#416 • feature/gift-card-balance",
          stateLabel: null,
          isDisabled: false,
        },
        { id: "branch-spike/returns", label: "spike/returns", detail: "Branch • 2 hours ago", stateLabel: null, isDisabled: false },
      ],
      message: null,
    })
  })

  it("marks a review target that already has a Flight Plan and keeps it from being chosen", () => {
    expect(buildTargetSuggestions([{ target: BRANCH, hasFlightPlan: true }], "", NOW).options).toMatchObject([
      { stateLabel: "Has a Flight Plan", isDisabled: true },
    ])
  })

  it("says why there is nothing to choose", () => {
    expect(buildTargetSuggestions([], " ", NOW).message).toBe("No open pull requests or branches.")
    expect(buildTargetSuggestions([], "gift", NOW).message).toBe("No pull request or branch matches.")
  })
})
