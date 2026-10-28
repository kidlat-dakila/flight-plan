import type { ReviewRequest, ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import { withRequiredSections } from "@/procedures/read-artifact/utils/required-nodes"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { withConfiguration } from "@/procedures/request-review/utils/starting-artifact"
import type { WriteUpReviewInput, WriteUpResult } from "./schemas"

export type PlannedWriteUp
  = | { readonly kind: "planned", readonly scaffold: ReviewScaffold, readonly hasWork: boolean }
    | Extract<WriteUpResult, { kind: "rejected" }>

export interface WriteUpSource {
  readonly scaffold: ReviewScaffold
  readonly configuration: Configuration | null
  readonly writer: ReviewWriter | null
  readonly noAgentMessage: string
  readonly now: Date
}

const MISSING_CONFIGURATION_MESSAGE = "This configuration no longer exists. Pick another one."
const NO_SECTION_MESSAGE = "Choose at least one part for the agent to explain."
const DRAFTING_STATUS = "drafting"

const rejected = (field: Extract<WriteUpResult, { kind: "rejected" }>["field"], message: string): PlannedWriteUp => ({ kind: "rejected", field, message })

const requestOf = (previous: ReviewRequest, input: WriteUpReviewInput, configuration: Configuration, writer: ReviewWriter, now: Date): ReviewRequest => ({
  ...previous,
  configurationId: configuration.id,
  preset: configuration.preset,
  writer,
  requestedAt: now,
  writeUp: { sections: input.sections, walkthroughOrder: input.walkthroughOrder },
})

export const planWriteUp = (input: WriteUpReviewInput, { scaffold, configuration, writer, noAgentMessage, now }: WriteUpSource): PlannedWriteUp => {
  if (input.sections.length === 0) return rejected("sections", NO_SECTION_MESSAGE)
  if (configuration === null) return rejected("configuration", MISSING_CONFIGURATION_MESSAGE)
  if (writer === null) return rejected("agent", noAgentMessage)
  const configured = withConfiguration({ ...scaffold.artifact, isSegmented: input.isSegmented }, { requiredContextKinds: configuration.contextCodeBlockKinds })
  const required = withRequiredSections(configured, input.sections)
  const hasWork = unwrittenWork(required).length > 0 || input.sections.includes("findings")
  return {
    kind: "planned",
    hasWork,
    scaffold: {
      ...scaffold,
      artifact: hasWork ? { ...required, status: DRAFTING_STATUS } : required,
      request: requestOf(scaffold.request, input, configuration, writer, now),
    },
  }
}
