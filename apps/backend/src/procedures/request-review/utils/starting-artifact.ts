import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { withSections } from "@/procedures/read-artifact/utils/artifact-sections"
import type { ReviewArtifact, SectionSwitches } from "@flightplan/configurations"

const AUTHORING_STATUS = "authoring"

const startsEmpty = (writer: ReviewWriter): boolean => writer.kind === "author" && writer.start === "empty"

const authoredFrom = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact =>
  writer.kind === "author" ? { ...scaffold, status: AUTHORING_STATUS } : scaffold

export const startingArtifactOf = (scaffold: ReviewArtifact, writer: ReviewWriter, sections: SectionSwitches): ReviewArtifact => {
  const starting = authoredFrom(withSections(scaffold, sections), writer)
  return startsEmpty(writer) ? { ...starting, segments: [] } : starting
}
