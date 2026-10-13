import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import { requiresContextCodeBlocks } from "@/procedures/read-artifact/utils/context-code-blocks"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { withConfiguration } from "@/procedures/request-review/utils/starting-artifact"
import { PRESET_REQUIRES_CONTEXT_CODE_BLOCKS, PRESET_SECTIONS, type ReviewArtifact } from "@flightplan/configurations"
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
  if (isTotalRewrite(mode, previousRequest, request)) {
    return withConfiguration(rebuilt, {
      sections: PRESET_SECTIONS[request.preset],
      requiresContextCodeBlocks: PRESET_REQUIRES_CONTEXT_CODE_BLOCKS[request.preset],
    })
  }
  const sections = sectionsOf(previous)
  const configured = withConfiguration(rebuilt, { sections, requiresContextCodeBlocks: requiresContextCodeBlocks(previous) })
  const carried = carryWriting(previous, configured, isOrderKept(previousRequest, request) ? "written" : "rebuilt")
  const isFinished = previous.status === COMPLETE_STATUS && unwrittenWork(carried, sections).length === 0
  return isFinished ? { ...carried, status: COMPLETE_STATUS } : carried
}
