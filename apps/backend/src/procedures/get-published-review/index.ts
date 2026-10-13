import type { ProcedureContext } from "@/procedures/context"
import { findReviewSubject } from "@/procedures/get-review"
import { NO_WRITING_ACTIVITY } from "@/procedures/get-review/utils/build-progress"
import { buildReviewPage } from "@/procedures/get-review/utils/build-review-page"
import { EMPTY_DISCUSSION } from "@/procedures/get-review/utils/discussion"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { highlightReview, NO_REVIEWED_MARKS } from "@flightplan/codegraph"
import { buildPublishedReview } from "./utils/build-published-review"
import type { GetPublishedReviewInput, PublishedReview } from "./utils/schemas"

const UNFILTERED = { filterKeys: null, isShowingReviewed: false } as const

export const getPublishedReview = async (
  input: GetPublishedReviewInput,
  context: ProcedureContext,
): Promise<PublishedReview | null> => {
  const subject = await findReviewSubject(input, context)
  if (subject?.artifact == null) return null
  const highlighted = await highlightReview(subject.artifact, context.highlightCode)
  const page = buildReviewPage(
    {
      ...subject,
      isOwn: false,
      detail: null,
      notice: null,
      branchLinking: null,
      marks: NO_REVIEWED_MARKS,
      discussion: EMPTY_DISCUSSION,
      publications: [],
      isPublishing: false,
      now: context.now(),
      setup: EMPTY_SETUP,
      startableAgents: [],
      agentModels: {},
      activity: NO_WRITING_ACTIVITY,
      ...highlighted,
    },
    { ...input, ...UNFILTERED },
  )
  return page.kind === "artifact" ? buildPublishedReview(page, subject.target) : null
}
