import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { buildAddableSuggestions } from "@/procedures/search-addable-targets/utils/build-addable-suggestions"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const PULL_REQUEST: ReviewTarget = {
  kind: "pull-request",
  number: 409,
  title: "Retry failed payment webhooks with backoff",
  branch: "fix/webhook-retry",
  author: "jonas",
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

describe("buildAddableSuggestions", () => {
  it("words a pull request by its title and a branch by its name, and marks what the line already lists", () => {
    expect(buildAddableSuggestions([PULL_REQUEST, BRANCH], ["pr-409"], "", NOW)).toStrictEqual({
      options: [
        {
          id: "pr-409",
          label: "Retry failed payment webhooks with backoff",
          detail: "#409 • fix/webhook-retry",
          stateLabel: "Already listed",
          isDisabled: true,
        },
        { id: "branch-spike/returns", label: "spike/returns", detail: "Branch • 2 hours ago", stateLabel: null, isDisabled: false },
      ],
      message: null,
    })
  })

  it("says there is nothing to add for an empty query, and that nothing matches for a query", () => {
    expect(buildAddableSuggestions([], [], "", NOW).message).toBe("No branches to add.")
    expect(buildAddableSuggestions([], [], "zzz", NOW).message).toBe("No branch or pull request matches.")
  })
})
