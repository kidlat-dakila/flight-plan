import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import type { ReviewArtifact } from "@flightplan/configurations"

const startsEmpty = (writer: ReviewWriter): boolean => writer.kind === "author" && writer.start === "empty"

export const startingArtifactOf = (scaffold: ReviewArtifact, writer: ReviewWriter): ReviewArtifact =>
  startsEmpty(writer) ? { ...scaffold, segments: [] } : scaffold
