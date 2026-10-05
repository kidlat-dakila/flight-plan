import { toForgePullRequest } from "@/procedures/list-repositories/utils/forge-pull-request"
import type { PullRequestHistory } from "@flightplan/git-forge"

const history: PullRequestHistory = {
  number: 12,
  title: "Retry webhooks",
  headBranch: "fix/webhook-retry",
  state: "open",
  isDraft: false,
  author: { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  requestedReviewers: ["teo"],
  discussion: [{ login: "dev", at: "2026-10-01T10:00:00Z" }],
  commitDates: ["2026-10-01T07:00:00Z"],
}

describe("toForgePullRequest", () => {
  it("reads the dates of the history as dates", () => {
    expect(toForgePullRequest(history)).toStrictEqual({
      number: 12,
      title: "Retry webhooks",
      headBranch: "fix/webhook-retry",
      state: "open",
      isDraft: false,
      author: { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
      createdAt: new Date("2026-10-01T08:00:00Z"),
      updatedAt: new Date("2026-10-01T09:00:00Z"),
      requestedReviewerLogins: ["teo"],
      discussionActivity: [{ login: "dev", at: new Date("2026-10-01T10:00:00Z") }],
      commitDates: [new Date("2026-10-01T07:00:00Z")],
    })
  })

  it("reports no avatar when the forge sent none", () => {
    expect(toForgePullRequest({ ...history, author: { login: "mira", avatarUrl: "" } }).author.avatarUrl).toBeNull()
  })
})
