import type { ProcedureContext } from "@/procedures/context"
import { segmentsIn, unknownSegmentMessage } from "@/procedures/read-artifact/utils/artifact-walk"
import { openArtifact } from "@/procedures/read-artifact/utils/open-artifact"
import { tallyWork, unwrittenWork, WORK_KINDS } from "@/procedures/read-artifact/utils/unwritten-work"
import { itemsWithIds, unwrittenItems } from "./utils/node-items"
import type { NodesReading, ReadNodesInput } from "./utils/schemas"

const DEFAULT_ITEM_LIMIT = 10
const DEFAULT_MAX_LINE_COUNT = 120
const NOTHING_ASKED_MESSAGE = "Give `ids` for particular waypoints or nodes, or `unfilled: true` for what is left to write."

export const readNodes = async (input: ReadNodesInput, context: ProcedureContext): Promise<NodesReading> => {
  const opened = await openArtifact({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (opened.kind === "rejected") return opened
  if (input.ids === undefined && input.unfilled !== true) return { kind: "rejected", message: NOTHING_ASKED_MESSAGE }
  const { artifact } = opened
  const segments = segmentsIn(artifact, input.segmentId ?? null)
  if (input.segmentId !== undefined && segments.length === 0) {
    return { kind: "rejected", message: unknownSegmentMessage(artifact, input.segmentId) }
  }
  const work = unwrittenWork(artifact)
  const selection = { artifact, segments, work, maxLineCount: input.maxLines ?? DEFAULT_MAX_LINE_COUNT }
  if (input.ids !== undefined) return { kind: "selected", items: itemsWithIds(selection, input.ids) }
  const items = unwrittenItems(selection, input.needs ?? WORK_KINDS)
  const shown = items.slice(0, input.limit ?? DEFAULT_ITEM_LIMIT)
  return { kind: "unfilled", items: shown, total: items.length, remaining: items.length - shown.length, unwritten: tallyWork(work) }
}
