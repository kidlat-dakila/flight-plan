import type { ProcedureContext } from "@/procedures/context"
import { countLabel } from "@/procedures/get-review/utils/count-label"
import { openArtifact } from "@/procedures/read-artifact/utils/open-artifact"
import { amendNodes, countEdits, type NodeEdits } from "./utils/amend-nodes"
import type { ArtifactWriting, UpdateNodesInput } from "./utils/schemas"
import { writeAmendment } from "./utils/write-amendment"

export const updateNodes = async (input: UpdateNodesInput, context: ProcedureContext): Promise<ArtifactWriting> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const opened = await openArtifact(key, context)
  if (opened.kind === "rejected") return opened
  const edits: NodeEdits = {
    segmentId: input.segmentId,
    segment: { title: input.title, context: input.context, order: input.order, traceDiagramDescription: input.traceDiagramDescription },
    waypoints: input.waypoints ?? [],
    traceDiagram: input.traceDiagram ?? [],
    blastDiagram: input.blastDiagram ?? [],
    contextCodeBlocks: input.contextCodeBlocks ?? [],
  }
  const note = `Wrote ${countLabel(countEdits(edits), "entry", "entries")}.`
  return await writeAmendment(key, note, (artifact) => amendNodes(artifact, edits), context)
}
