import { targetPhrase } from "@/procedures/get-review/utils/build-notices"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { ReviewRequest } from "./review-request"
import { orderInstructionOf } from "./walkthrough-order-catalog"

const LINE_BREAK = "\n"
const SENTENCE_GAP = " "

export const buildReviewPrompt = (
  repository: Repository,
  target: ReviewTarget,
  key: ReviewKey,
  request: Pick<ReviewRequest, "order" | "customOrder">,
): string =>
  [
    `Review ${targetPhrase(repository, target)} with the Flight Plan review skill.`,
    `Flight Plan already built the structure of the review artifact, and the reviewer is reading it while you write. Fill it in through Flight Plan's MCP tools, with repositoryName "${key.repositoryName}" and targetId "${key.targetId}".`,
    "Read the configuration to write with from Flight Plan's MCP tools. Do not ask the reviewer for it.",
    orderInstructionOf(request.order, request.customOrder),
    "Do not ask the reviewer how to order the review: the order above is their answer.",
  ].join(LINE_BREAK)

export const toOneLine = (prompt: string): string => prompt.split(LINE_BREAK).join(SENTENCE_GAP)
