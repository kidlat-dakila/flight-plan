import { REVIEWER_NAME, type Discussion, type ReviewVerdict } from "@/procedures/get-review/utils/discussion"

export type ReviewSubmission
  = | { readonly kind: "submitted", readonly discussion: Discussion }
    | { readonly kind: "empty" }

const hasPendingComments = (discussion: Discussion): boolean =>
  discussion.threads.some((thread) => thread.comments.some((comment) => comment.isPending))

export const applyReview = (discussion: Discussion, verdict: ReviewVerdict, body: string, now: Date): ReviewSubmission =>
  verdict === "comment" && body === "" && !hasPendingComments(discussion)
    ? { kind: "empty" }
    : {
        kind: "submitted",
        discussion: {
          threads: discussion.threads.map((thread) => ({
            ...thread,
            comments: thread.comments.map((comment) => ({ ...comment, isPending: false })),
          })),
          reviews: [
            ...discussion.reviews,
            {
              id: `review-${String(discussion.reviews.length + 1)}`,
              author: REVIEWER_NAME,
              verdict,
              body,
              createdAt: now,
            },
          ],
        },
      }
