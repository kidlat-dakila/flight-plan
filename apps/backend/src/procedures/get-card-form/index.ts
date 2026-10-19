import type { ProcedureContext } from "@/procedures/context"
import { listTraceNodes } from "@flightplan/codegraph"
import { buildCardForm } from "./utils/build-card-form"
import type { CardForm, GetCardFormInput } from "./utils/schemas"

export const getCardForm = async (input: GetCardFormInput, context: ProcedureContext): Promise<CardForm | null> => {
  const artifact = await context.reviewStore.findArtifact({ repositoryName: input.repositoryName, targetId: input.targetId })
  const segment = artifact?.segments.find((candidate) => candidate.id === input.segmentId)
  const node = listTraceNodes(segment?.traceDiagram?.traceNodes ?? []).find((candidate) => candidate.id === input.nodeId)
  return artifact === null || segment === undefined || node === undefined ? null : buildCardForm(artifact, segment, node)
}
