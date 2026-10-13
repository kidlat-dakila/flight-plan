import { targetTitleOf } from "@/procedures/get-review/utils/build-shell"
import { COMPOSER_LABELS } from "@/procedures/get-review/utils/discussion"
import type { ReviewPage } from "@/procedures/get-review/utils/schemas"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { PublishedReview } from "./schemas"

export type WrittenReviewPage = Extract<ReviewPage, { kind: "artifact" }>

const PUBLISHED_LABEL = "Published Flight Plan"
const SHARE_LABEL = "Share"
const SUBMIT_LABEL = "Submit review"

const UNAVAILABLE_FEATURE = {
  title: "Only available in Flight Plan",
  description: "This is a published copy of a Flight Plan, so it can only be read. Open the review in Flight Plan to use this.",
  closeLabel: "OK",
} as const

export const buildPublishedReview = (page: WrittenReviewPage, target: ReviewTarget): PublishedReview => ({
  documentTitle: page.shell.documentTitle,
  header: { title: targetTitleOf(target), isBranch: target.kind === "branch", label: PUBLISHED_LABEL },
  actions: { shareLabel: SHARE_LABEL, submitLabel: SUBMIT_LABEL },
  unavailableFeature: UNAVAILABLE_FEATURE,
  unassignedFiles: page.unassignedFiles,
  rail: page.rail,
  segments: page.segments,
  walkthroughControls: page.walkthroughControls,
  composer: COMPOSER_LABELS,
  codeLinks: page.codeLinks,
  codeDefinitions: page.codeDefinitions,
})
