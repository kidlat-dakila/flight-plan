import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { PRESET_SECTIONS, type ReviewArtifact } from "@flightplan/configurations"
import { carryWriting } from "./carry-writing"
import type { RebuildMode } from "./schemas"

export interface Rebuild {
  readonly mode: RebuildMode
  readonly previous: ReviewArtifact
  readonly previousRequest: ReviewRequest | null
  readonly rebuilt: ReviewArtifact
  readonly request: ReviewRequest
}

const REGENERATE: RebuildMode = "regenerate"
const COMPLETE_STATUS = "complete"

export const isTotalRewrite = (mode: RebuildMode, previousRequest: ReviewRequest | null, request: ReviewRequest): boolean =>
  mode === REGENERATE || (previousRequest !== null && previousRequest.preset !== request.preset)

const isOrderKept = (previousRequest: ReviewRequest | null, request: ReviewRequest): boolean =>
  previousRequest === null || (previousRequest.order === request.order && previousRequest.customOrder === request.customOrder)

export const planRebuild = ({ mode, previous, previousRequest, rebuilt, request }: Rebuild): ReviewArtifact => {
  if (isTotalRewrite(mode, previousRequest, request)) return rebuilt
  const carried = carryWriting(previous, rebuilt, isOrderKept(previousRequest, request) ? "written" : "rebuilt")
  const isFinished = previous.status === COMPLETE_STATUS && unwrittenWork(carried, PRESET_SECTIONS[request.preset]).length === 0
  return isFinished ? { ...carried, status: COMPLETE_STATUS } : carried
}
