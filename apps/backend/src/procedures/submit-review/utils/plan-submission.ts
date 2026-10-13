import { staleCommentsOf, type ForgeAbilities, type PendingComment, type ReviewVerdict } from "@/procedures/get-review/utils/discussion"
import type { ForgeReviewSubmission } from "@/procedures/get-review/utils/pull-request-forge"

export interface SubmissionRequest {
  readonly verdict: ReviewVerdict
  readonly body: string
  readonly pendingComments: readonly PendingComment[]
  readonly commit: string
  readonly abilities: ForgeAbilities
}

export type PlannedSubmission
  = | { readonly kind: "planned", readonly submission: ForgeReviewSubmission }
    | { readonly kind: "rejected", readonly message: string }

const EMPTY_MESSAGE = "Write a summary or a comment before you submit."
const STALE_MESSAGE = "Some pending comments were written against an earlier commit. Discard them, then submit."
const VERDICT_MESSAGE = "The code host does not take that verdict from here."

export const planSubmission = ({ verdict, body, pendingComments, commit, abilities }: SubmissionRequest): PlannedSubmission => {
  if (!abilities.verdicts.includes(verdict)) return { kind: "rejected", message: VERDICT_MESSAGE }
  if (staleCommentsOf(pendingComments, commit).length > 0) return { kind: "rejected", message: STALE_MESSAGE }
  if (verdict === "comment" && body === "" && pendingComments.length === 0) return { kind: "rejected", message: EMPTY_MESSAGE }
  return {
    kind: "planned",
    submission: {
      verdict,
      body,
      comments: pendingComments.map((pending) => ({ position: pending.position, body: pending.body })),
      commit,
    },
  }
}
