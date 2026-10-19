import type { ProcedureContext } from "@/procedures/context"
import { findReviewSubject } from "@/procedures/get-review"
import { NO_WRITING_ACTIVITY } from "@/procedures/get-review/utils/build-progress"
import { buildReviewPage } from "@/procedures/get-review/utils/build-review-page"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { highlightReview, NO_REVIEWED_MARKS } from "@flightplan/codegraph"
import { buildPublishedReview } from "./utils/build-published-review"
import { buildImportLink } from "./utils/import-link"
import type { GetPublishedReviewInput, PublishedReview } from "./utils/schemas"

const UNFILTERED = { filterKeysBySegment: {}, reviewedSegmentIds: [] }

export const getPublishedReview = async (
  input: GetPublishedReviewInput,
  context: ProcedureContext,
): Promise<PublishedReview | null> => {
  const subject = await findReviewSubject(input, context)
  if (subject?.artifact == null) return null
  const [highlighted, publications, scaffold] = await Promise.all([
    highlightReview(subject.artifact, context.highlightCode),
    context.reviewStore.readPublications(input),
    context.reviewStore.readScaffold(input),
  ])
  const artifactUrl = publications.find((publication) => publication.kind === "claude")?.url ?? null
  const page = buildReviewPage(
    {
      ...subject,
      isOwn: false,
      isStored: false,
      detail: null,
      forge: null,
      notice: null,
      branchLinking: null,
      marks: NO_REVIEWED_MARKS,
      pendingComments: [],
      publications: [],
      isPublishing: false,
      now: context.now(),
      setup: EMPTY_SETUP,
      configurations: [],
      startableAgents: [],
      chatLinkIds: [],
      agentModels: {},
      activity: NO_WRITING_ACTIVITY,
      ...highlighted,
    },
    { ...input, ...UNFILTERED },
  )
  if (page.kind !== "artifact") return null
  return buildPublishedReview(page, subject.target, artifactUrl === null || scaffold === null ? null : buildImportLink(input, artifactUrl, context.appUrl))
}
