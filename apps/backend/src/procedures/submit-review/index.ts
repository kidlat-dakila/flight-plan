import type { ProcedureContext } from "@/procedures/context"
import { findPullRequestSubject } from "@/procedures/get-review"
import { ACTION_DONE, refuseAction, type ReviewActionResult } from "@/procedures/get-review/utils/review-action"
import { planSubmission } from "./utils/plan-submission"
import type { SubmitReviewInput } from "./utils/schemas"

const NO_FLIGHT_PLAN = "This pull request has no Flight Plan to review yet."

export const submitReview = async (input: SubmitReviewInput, context: ProcedureContext): Promise<ReviewActionResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const subject = await findPullRequestSubject(key, context)
  if (subject === null) return null
  if (subject.forge?.kind !== "read") return refuseAction(subject.forge?.reason ?? NO_FLIGHT_PLAN)
  if (subject.artifact === null) return refuseAction(NO_FLIGHT_PLAN)
  const planned = planSubmission({
    verdict: input.verdict,
    body: input.body,
    pendingComments: await context.reviewStore.readPendingComments(key),
    commit: subject.artifact.commit,
    abilities: subject.forge.pullRequest.abilities,
  })
  if (planned.kind === "rejected") return refuseAction(planned.message)
  const outcome = await context.pullRequestForge.submitReview(subject.repository, subject.target.number, planned.submission)
  if (outcome.kind === "refused") return refuseAction(outcome.reason)
  await context.reviewStore.writePendingComments(key, [])
  await context.repositoryStore.refresh(subject.repository.name)
  return ACTION_DONE
}
