import type { ProcedureContext } from "@/procedures/context"
import { findPullRequestSubject } from "@/procedures/get-review"
import { toActionResult, type ReviewActionResult } from "@/procedures/get-review/utils/review-action"
import type { ReplyToThreadInput } from "./utils/schemas"

export const replyToThread = async (input: ReplyToThreadInput, context: ProcedureContext): Promise<ReviewActionResult | null> => {
  const subject = await findPullRequestSubject({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (subject === null) return null
  return toActionResult(
    await context.pullRequestForge.reply(subject.repository, subject.target.number, input.threadId, input.body),
  )
}
