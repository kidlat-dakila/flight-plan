import { isWrittenByAgent, type ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { withContextRequirement } from "@/procedures/read-artifact/utils/context-code-blocks"
import { withRequiredSections } from "@/procedures/read-artifact/utils/required-nodes"
import type { ContextCodeBlockKind, ReviewArtifact } from "@flightplan/configurations"

export interface ConfigurationChoices {
  readonly requiredContextKinds: readonly ContextCodeBlockKind[]
}

const AUTHORING_STATUS = "authoring"

const startsEmpty = (writer: ReviewWriter): boolean => writer.kind === "author" && writer.start === "empty"

const authoredFrom = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact =>
  writer.kind === "author" ? { ...scaffold, status: AUTHORING_STATUS } : scaffold

export const withConfiguration = (artifact: ReviewArtifact, { requiredContextKinds }: ConfigurationChoices): ReviewArtifact =>
  withContextRequirement(artifact, requiredContextKinds)

export const startingArtifactOf = (scaffold: ReviewArtifact, writer: ReviewWriter, choices: ConfigurationChoices): ReviewArtifact => {
  const configured = withConfiguration(scaffold, choices)
  const starting = authoredFrom(isWrittenByAgent(writer) ? withRequiredSections(configured, WRITE_UP_SECTIONS) : configured, writer)
  return startsEmpty(writer) ? { ...starting, segments: [] } : starting
}
