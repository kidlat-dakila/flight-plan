import type { ProcedureContext } from "@/procedures/context"
import { segmentsIn, unknownSegmentMessage } from "./utils/artifact-walk"
import { openArtifact } from "./utils/open-artifact"
import { projectDiff, projectOverview, projectSegments } from "./utils/project-artifact"
import type { ArtifactReading, ReadArtifactInput } from "./utils/schemas"

const DEFAULT_DIFF_FILE_LIMIT = 25

export const readArtifact = async (input: ReadArtifactInput, context: ProcedureContext): Promise<ArtifactReading> => {
  const opened = await openArtifact({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (opened.kind === "rejected") return opened
  const { artifact } = opened
  const segments = segmentsIn(artifact, input.segmentId ?? null)
  if (input.segmentId !== undefined && segments.length === 0) {
    return { kind: "rejected", message: unknownSegmentMessage(artifact, input.segmentId) }
  }
  if (input.section === "overview") {
    return { kind: "read", content: projectOverview(artifact, opened.configuration.id) }
  }
  if (input.section !== "diff") return { kind: "read", content: projectSegments(input.section, artifact, segments) }
  const diff = projectDiff(artifact, segments, {
    paths: input.paths ?? null,
    limit: input.limit ?? DEFAULT_DIFF_FILE_LIMIT,
    after: input.after ?? null,
  })
  return diff.kind === "refused" ? { kind: "rejected", message: diff.message } : { kind: "read", content: diff.content }
}
