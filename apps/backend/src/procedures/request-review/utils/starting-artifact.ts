import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { withSections } from "@/procedures/read-artifact/utils/artifact-sections"
import { withContextRequirement } from "@/procedures/read-artifact/utils/context-code-blocks"
import type { ContextCodeBlockKind, ReviewArtifact, SectionSwitches } from "@flightplan/configurations"

export interface ConfigurationChoices {
  readonly sections: SectionSwitches
  readonly requiredContextKinds: readonly ContextCodeBlockKind[]
}

const AUTHORING_STATUS = "authoring"

const startsEmpty = (writer: ReviewWriter): boolean => writer.kind === "author" && writer.start === "empty"

const authoredFrom = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact =>
  writer.kind === "author" ? { ...scaffold, status: AUTHORING_STATUS } : scaffold

export const withConfiguration = (artifact: ReviewArtifact, { sections, requiredContextKinds }: ConfigurationChoices): ReviewArtifact =>
  withContextRequirement(withSections(artifact, sections), requiredContextKinds)

export const startingArtifactOf = (scaffold: ReviewArtifact, writer: ReviewWriter, choices: ConfigurationChoices): ReviewArtifact => {
  const starting = authoredFrom(withConfiguration(scaffold, choices), writer)
  return startsEmpty(writer) ? { ...starting, segments: [] } : starting
}
