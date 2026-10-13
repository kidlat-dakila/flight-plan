import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import type { ReviewArtifact } from "@flightplan/configurations"

const AUTHORING_STATUS = "authoring"

const startsEmpty = (writer: ReviewWriter): boolean => writer.kind === "author" && writer.start === "empty"

const authoredFrom = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact =>
  writer.kind === "author" ? { ...scaffold, status: AUTHORING_STATUS } : scaffold

export const startingArtifactOf = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact => {
  const starting = authoredFrom(scaffold, writer)
  return startsEmpty(writer) ? { ...starting, segments: [] } : starting
}
