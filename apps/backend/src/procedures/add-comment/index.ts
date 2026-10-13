import type { ProcedureContext } from "@/procedures/context"
import { findPullRequestSubject } from "@/procedures/get-review"
import { ACTION_DONE, refuseAction, toActionResult, type ReviewActionResult } from "@/procedures/get-review/utils/review-action"
import { planPendingComment, singleCommentReviewOf } from "./utils/plan-pending-comment"
import type { AddCommentInput } from "./utils/schemas"

const NO_FLIGHT_PLAN = "This pull request has no Flight Plan to comment on yet."
const NO_SINGLE_COMMENT = "The code host does not take a comment on a line from here. Add it to your review instead."

export const addComment = async (input: AddCommentInput, context: ProcedureContext): Promise<ReviewActionResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const subject = await findPullRequestSubject(key, context)
  if (subject === null) return null
  if (subject.forge?.kind !== "read") return refuseAction(subject.forge?.reason ?? NO_FLIGHT_PLAN)
  if (input.position === null) {
    return toActionResult(await context.pullRequestForge.addComment(subject.repository, subject.target.number, input.body))
  }
  if (subject.artifact === null) return refuseAction(NO_FLIGHT_PLAN)
  const planned = planPendingComment(subject.artifact, {
    id: context.conversationEnvironment.newId(),
    position: input.position,
    body: input.body,
    now: context.now(),
  })
  if (planned.kind === "rejected") return refuseAction(planned.message)
  if (input.shouldPostNow) {
    if (!subject.forge.pullRequest.abilities.verdicts.includes("comment")) return refuseAction(NO_SINGLE_COMMENT)
    return toActionResult(
      await context.pullRequestForge.submitReview(subject.repository, subject.target.number, singleCommentReviewOf(planned.comment)),
    )
  }
  const pendingComments = await context.reviewStore.readPendingComments(key)
  await context.reviewStore.writePendingComments(key, [...pendingComments, planned.comment])
  return ACTION_DONE
}
