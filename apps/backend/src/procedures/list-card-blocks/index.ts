import type { ProcedureContext } from "@/procedures/context"
import { readFileText } from "@/procedures/get-file-code/utils/file-text"
import { listCardBlocks as listBlocksOfGraph, listTraceNodes, readFileGraph } from "@flightplan/codegraph"
import type { ASTGraph, TraceDiagram } from "@flightplan/configurations"
import { toBlockOption } from "./utils/block-options"
import type { CardBlocks, ListCardBlocksInput } from "./utils/schemas"

const NO_BLOCKS_MESSAGE = "No code block was read in this file. Select lines instead."

const graphIn = (traceDiagram: TraceDiagram | null, path: string): ASTGraph | null =>
  traceDiagram?.astCodeGroup.astGraphs.find((astGraph) => astGraph.filePath === path) ?? null

export const listCardBlocks = async (input: ListCardBlocksInput, context: ProcedureContext): Promise<CardBlocks | null> => {
  const artifact = await context.reviewStore.findArtifact({ repositoryName: input.repositoryName, targetId: input.targetId })
  const segment = artifact?.segments.find((candidate) => candidate.id === input.segmentId)
  if (artifact === null || segment === undefined) return null
  const text = await readFileText(input, artifact, context)
  if (text === null) return null
  const astGraph = graphIn(segment.traceDiagram, input.path) ?? readFileGraph(input.path, text)
  const heldCardIds = new Set(listTraceNodes(segment.traceDiagram?.traceNodes ?? []).map((node) => node.id))
  const blocks = astGraph === null ? [] : listBlocksOfGraph(astGraph).map((block) => toBlockOption(block, heldCardIds))
  return { path: input.path, blocks, message: blocks.length === 0 ? NO_BLOCKS_MESSAGE : null }
}
