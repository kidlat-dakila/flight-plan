import { EMPTY_DISCUSSION, type Discussion } from "@/procedures/get-review/utils/discussion"
import { applyReview } from "@/procedures/submit-review/utils/apply-review"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const withPendingComment: Discussion = {
  reviews: [],
  threads: [
    { id: "thread-1", path: null, line: null, comments: [{ id: "comment-1", author: "you", body: "Hm.", createdAt: NOW, isPending: true }] },
  ],
}

describe("applyReview", () => {
  it("sends the pending comments and records the review with its verdict", () => {
    expect(applyReview(withPendingComment, "request-changes", "Fix the rounding.", NOW)).toMatchObject({
      kind: "submitted",
      discussion: {
        threads: [{ comments: [{ isPending: false }] }],
        reviews: [{ id: "review-1", author: "you", verdict: "request-changes", body: "Fix the rounding.", createdAt: NOW }],
      },
    })
  })

  it("accepts an approval with nothing written", () => {
    expect(applyReview(EMPTY_DISCUSSION, "approve", "", NOW).kind).toBe("submitted")
  })

  it("refuses a plain comment review with no summary and no pending comments", () => {
    expect(applyReview(EMPTY_DISCUSSION, "comment", "", NOW)).toStrictEqual({ kind: "empty" })
    expect(applyReview(withPendingComment, "comment", "", NOW).kind).toBe("submitted")
  })
})
