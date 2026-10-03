import { deriveBranchStatus } from "@/procedures/list-repositories/utils/derive-branch-status"
import type { ForgePullRequest } from "@/procedures/list-repositories/utils/forge-pull-request"

const at = (hour: number): Date => new Date(`2026-10-01T${String(hour).padStart(2, "0")}:00:00.000Z`)

const pullRequest = (overrides: Partial<ForgePullRequest> = {}): ForgePullRequest => ({
  number: 7,
  title: "Add the thing",
  headBranch: "feature/thing",
  state: "open",
  isDraft: false,
  author: { login: "mira", avatarUrl: null },
  createdAt: at(8),
  updatedAt: at(9),
  requestedReviewerLogins: [],
  discussionActivity: [],
  commitDates: [at(8)],
  ...overrides,
})

describe("deriveBranchStatus", () => {
  it("reports merged and closed pull requests by their state", () => {
    expect(deriveBranchStatus(pullRequest({ state: "merged" }), "dev")).toBe("merged")
    expect(deriveBranchStatus(pullRequest({ state: "closed" }), "dev")).toBe("closed")
  })

  it("reports a draft pull request as a draft", () => {
    expect(deriveBranchStatus(pullRequest({ isDraft: true }), "dev")).toBe("draft")
  })

  it("lets a closed draft stay closed", () => {
    expect(deriveBranchStatus(pullRequest({ isDraft: true, state: "closed" }), "dev")).toBe("closed")
  })

  describe("when the user reviews someone else's pull request", () => {
    it("reports no review while the user has left nothing", () => {
      const others = [{ login: "teo", at: at(10) }]

      expect(deriveBranchStatus(pullRequest({ discussionActivity: others }), "dev")).toBe("no-review")
    })

    it("reports awaiting review when the author pushed after the user's last review", () => {
      const review = pullRequest({
        discussionActivity: [{ login: "dev", at: at(10) }],
        commitDates: [at(8), at(11)],
      })

      expect(deriveBranchStatus(review, "dev")).toBe("awaiting-review")
    })

    it("reports awaiting reply when the author answered and pushed nothing", () => {
      const review = pullRequest({
        discussionActivity: [
          { login: "dev", at: at(10) },
          { login: "mira", at: at(11) },
        ],
      })

      expect(deriveBranchStatus(review, "dev")).toBe("awaiting-reply")
    })

    it("reports awaiting review when the author both answered and pushed", () => {
      const review = pullRequest({
        discussionActivity: [
          { login: "dev", at: at(10) },
          { login: "mira", at: at(11) },
        ],
        commitDates: [at(8), at(12)],
      })

      expect(deriveBranchStatus(review, "dev")).toBe("awaiting-review")
    })

    it("reports stale when nothing changed since the user's review", () => {
      const review = pullRequest({ discussionActivity: [{ login: "dev", at: at(10) }] })

      expect(deriveBranchStatus(review, "dev")).toBe("stale")
    })

    it("compares logins without regard to case", () => {
      const review = pullRequest({ discussionActivity: [{ login: "Dev", at: at(10) }] })

      expect(deriveBranchStatus(review, "dEV")).toBe("stale")
    })
  })

  describe("when the user owns the pull request", () => {
    const own = (overrides: Partial<ForgePullRequest>): ForgePullRequest =>
      pullRequest({ author: { login: "dev", avatarUrl: null }, ...overrides })

    it("reports no review while nobody has commented", () => {
      expect(deriveBranchStatus(own({ requestedReviewerLogins: ["teo"] }), "dev")).toBe("no-review")
    })

    it("counts the comments of any other engineer as a review", () => {
      const review = own({ discussionActivity: [{ login: "teo", at: at(10) }], commitDates: [at(9)] })

      expect(deriveBranchStatus(review, "dev")).toBe("stale")
    })

    it("reports awaiting reply when the user answered a reviewer", () => {
      const review = own({
        discussionActivity: [
          { login: "teo", at: at(10) },
          { login: "dev", at: at(11) },
        ],
      })

      expect(deriveBranchStatus(review, "dev")).toBe("awaiting-reply")
    })

    it("does not count the user's own comments as a review", () => {
      const review = own({ discussionActivity: [{ login: "dev", at: at(10) }] })

      expect(deriveBranchStatus(review, "dev")).toBe("no-review")
    })

    it("reports awaiting review when the user pushed after the last review", () => {
      const review = own({ discussionActivity: [{ login: "teo", at: at(10) }], commitDates: [at(12)] })

      expect(deriveBranchStatus(review, "dev")).toBe("awaiting-review")
    })
  })
})
