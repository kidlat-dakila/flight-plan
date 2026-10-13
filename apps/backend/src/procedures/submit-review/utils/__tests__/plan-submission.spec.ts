import type { ForgeAbilities, PendingComment } from "@/procedures/get-review/utils/discussion"
import { planSubmission } from "@/procedures/submit-review/utils/plan-submission"

const COMMIT = "abc1234"
const POSITION = { path: "src/price.ts", side: "new" as const, startLine: 4, endLine: 6 }

const abilities: ForgeAbilities = {
  verdicts: ["comment", "approve"],
  canReply: true,
  canResolve: true,
  canRequestReviewers: true,
  canRequestAgain: true,
}

const pending = (commit: string): PendingComment => ({
  id: "c1",
  position: POSITION,
  body: "Why?",
  createdAt: new Date("2026-10-01T12:00:00.000Z"),
  commit,
})

describe("planSubmission", () => {
  it("plans the verdict, the summary and the pending comments against the commit", () => {
    expect(
      planSubmission({ verdict: "approve", body: "Good.", pendingComments: [pending(COMMIT)], commit: COMMIT, abilities }),
    ).toStrictEqual({
      kind: "planned",
      submission: { verdict: "approve", body: "Good.", comments: [{ position: POSITION, body: "Why?" }], commit: COMMIT },
    })
  })

  it("takes an approval with nothing else in it", () => {
    expect(planSubmission({ verdict: "approve", body: "", pendingComments: [], commit: COMMIT, abilities })).toMatchObject({
      kind: "planned",
    })
  })

  it("rejects a comment review with no summary and no pending comment", () => {
    expect(planSubmission({ verdict: "comment", body: "", pendingComments: [], commit: COMMIT, abilities })).toMatchObject({
      kind: "rejected",
    })
  })

  it("rejects a verdict the code host does not take", () => {
    expect(
      planSubmission({ verdict: "request-changes", body: "No.", pendingComments: [], commit: COMMIT, abilities }),
    ).toMatchObject({ kind: "rejected" })
  })

  it("rejects while a pending comment was written against another commit", () => {
    expect(
      planSubmission({ verdict: "approve", body: "", pendingComments: [pending("0000000")], commit: COMMIT, abilities }),
    ).toMatchObject({ kind: "rejected" })
  })
})
