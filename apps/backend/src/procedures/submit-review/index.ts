import type { ProcedureContext } from "@/procedures/context"
import { applyReview } from "./utils/apply-review"
import type { SubmitReviewInput } from "./utils/schemas"

export type SubmitReviewResult
  = | { readonly kind: "submitted", readonly message: string }
    | { readonly kind: "empty", readonly message: string }
    | { readonly kind: "unavailable", readonly message: string }

export const submitReview = async (input: SubmitReviewInput, context: ProcedureContext): Promise<SubmitReviewResult> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [detail, discussion] = await Promise.all([
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readDiscussion(key),
  ])
  if (detail?.forgeUrl == null) return { kind: "unavailable", message: "This review target has no pull request to review." }
  const submission = applyReview(discussion, input.verdict, input.body, context.now())
  if (submission.kind === "empty") return { kind: "empty", message: "Write a summary or a comment before you submit." }
  await context.reviewStore.writeDiscussion(key, submission.discussion)
  return { kind: "submitted", message: "Review submitted" }
}
