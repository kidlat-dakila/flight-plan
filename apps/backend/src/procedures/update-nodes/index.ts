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
    segment: { title: input.title, context: input.context, intro: input.intro, order: input.order, journeyDescription: input.journeyDescription },
    waypoints: input.waypoints ?? [],
    files: input.files ?? [],
    journey: input.journey ?? [],
    blast: input.blast ?? [],
  }
  const note = `Wrote ${countLabel(countEdits(edits), "entry", "entries")}.`
  return await writeAmendment(key, opened.sections, note, (artifact) => amendNodes(artifact, edits), context)
}
