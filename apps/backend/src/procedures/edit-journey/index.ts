import type { ProcedureContext } from "@/procedures/context"
import { readFileText } from "@/procedures/get-file-code/utils/file-text"
import { planDiagramEdit } from "./utils/plan-diagram-edit"
import type { EditJourneyInput, JourneyEditing } from "./utils/schemas"

const readCardText = async ({ repositoryName, targetId, edit }: EditJourneyInput, context: ProcedureContext): Promise<string | null> => {
  if (edit.kind !== "add-card") return null
  const artifact = await context.reviewStore.findArtifact({ repositoryName, targetId })
  return artifact === null ? null : await readFileText({ repositoryName, path: edit.path }, artifact, context)
}

export const editJourney = async (input: EditJourneyInput, context: ProcedureContext): Promise<JourneyEditing | null> => {
  const cardText = await readCardText(input, context)
  return await context.reviewStore.amendArtifact<JourneyEditing>(
    { repositoryName: input.repositoryName, targetId: input.targetId },
    (artifact) => {
      const planned = planDiagramEdit(artifact, input.segmentId, input.edit, cardText)
      return planned.kind === "rejected"
        ? { artifact: null, outcome: planned }
        : { artifact: planned.artifact, outcome: { kind: "saved", nodeId: planned.nodeId } }
    },
  )
}
