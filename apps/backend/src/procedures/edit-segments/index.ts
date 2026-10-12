import type { ProcedureContext } from "@/procedures/context"
import { segmentIdOf } from "@flightplan/codegraph"
import { planSegmentEdit } from "./utils/plan-segment-edit"
import type { EditSegmentsInput, SegmentsEditing } from "./utils/schemas"

export const editSegments = async (input: EditSegmentsInput, context: ProcedureContext): Promise<SegmentsEditing | null> => {
  const newSegmentId = segmentIdOf(context.conversationEnvironment.newId())
  return await context.reviewStore.amendArtifact<SegmentsEditing>(
    { repositoryName: input.repositoryName, targetId: input.targetId },
    (artifact) => {
      const planned = planSegmentEdit(artifact, input.edit, newSegmentId)
      return planned.kind === "rejected"
        ? { artifact: null, outcome: planned }
        : { artifact: planned.artifact, outcome: { kind: "saved" } }
    },
  )
}
