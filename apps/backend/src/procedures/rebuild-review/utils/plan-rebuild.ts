import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import { requiredContextKindsOf } from "@/procedures/read-artifact/utils/context-code-blocks"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { withConfiguration } from "@/procedures/request-review/utils/starting-artifact"
import type { ReviewArtifact } from "@flightplan/configurations"
import { carryWriting } from "./carry-writing"
import type { RebuildMode } from "./schemas"

export interface Rebuild {
  readonly mode: RebuildMode
  readonly previous: ReviewArtifact
  readonly previousRequest: ReviewRequest | null
  readonly rebuilt: ReviewArtifact
  readonly request: ReviewRequest
  readonly configuration: Configuration
}

const REGENERATE: RebuildMode = "regenerate"
const COMPLETE_STATUS = "complete"

export const isTotalRewrite = (mode: RebuildMode, previousRequest: ReviewRequest | null, request: ReviewRequest): boolean =>
  mode === REGENERATE || (previousRequest !== null && previousRequest.configurationId !== request.configurationId)

const isOrderKept = (previousRequest: ReviewRequest | null, request: ReviewRequest): boolean =>
  previousRequest === null || (previousRequest.order === request.order && previousRequest.customOrder === request.customOrder)

export const planRebuild = ({ mode, previous, previousRequest, rebuilt, request, configuration }: Rebuild): ReviewArtifact => {
  if (isTotalRewrite(mode, previousRequest, request)) {
    return withConfiguration(rebuilt, {
      sections: configuration.sections,
      requiredContextKinds: configuration.contextCodeBlockKinds,
    })
  }
  const sections = sectionsOf(previous)
  const configured = withConfiguration(rebuilt, { sections, requiredContextKinds: requiredContextKindsOf(previous) })
  const carried = carryWriting(previous, configured, isOrderKept(previousRequest, request) ? "written" : "rebuilt")
  const isFinished = previous.status === COMPLETE_STATUS && unwrittenWork(carried, sections).length === 0
  return isFinished ? { ...carried, status: COMPLETE_STATUS } : carried
}
