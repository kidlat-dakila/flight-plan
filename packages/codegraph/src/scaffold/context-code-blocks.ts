import { listJourneyNodes } from "@/journey-flow-diagram"
import { firstOfEach } from "@/shared/first-of-each"
import type { ASTGraph, CodeBlock, CodeBlockSymbol, CodeBlockType, ContextCodeBlock, JourneyFlowDiagram, Waypoint } from "@flightplan/configurations"

export interface ViewedSegment {
  readonly journey: JourneyFlowDiagram | null
  readonly walkthrough: { readonly files: readonly { readonly waypoints: readonly Waypoint[] }[] }
}

const UNDESCRIBED_TYPES: readonly CodeBlockType[] = ["import", "root-statement", "file", "deleted"]
const USED_BLOCK_SYMBOL = "external-block"

const listWaypoints = (waypoints: readonly Waypoint[]): Waypoint[] =>
  waypoints.flatMap((waypoint) => [waypoint, ...listWaypoints(waypoint.children)])

const listViewedGraphs = ({ journey, walkthrough }: ViewedSegment): ASTGraph[] => [
  ...walkthrough.files.flatMap((file) => listWaypoints(file.waypoints)).flatMap((waypoint) => waypoint.codeBlocks.map((block) => block.astGraph)),
  ...listJourneyNodes(journey?.journeyNodes ?? []).map((node) => node.codeBlocks[0].astGraph),
]

const usedBlockOf = (symbol: CodeBlockSymbol): CodeBlock[] => (symbol.type === USED_BLOCK_SYMBOL ? [symbol.codeBlockReference] : [])

const listBlocksOf = (astGraph: ASTGraph): CodeBlock[] => [
  ...astGraph.rootBlocks,
  ...astGraph.codeBlocks.flatMap((block) => block.outerSymbols.flatMap(usedBlockOf)),
]

const isDescribed = (block: CodeBlock): boolean => !UNDESCRIBED_TYPES.includes(block.type)

const firstLineOf = (block: CodeBlock): number => block.lineOfCodeRangeReference[0].start.line

const inReadingOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => one.astGraph.filePath.localeCompare(two.astGraph.filePath) || firstLineOf(one) - firstLineOf(two))

export const listContextCodeBlocks = (segments: readonly ViewedSegment[]): ContextCodeBlock[] => {
  const viewedGraphs = [...new Set(segments.flatMap(listViewedGraphs))]
  const blocks = firstOfEach(viewedGraphs.flatMap(listBlocksOf).filter(isDescribed), (block) => block.id)
  return inReadingOrder(blocks).map((codeBlock) => ({ isRequired: false, codeBlock, description: null }))
}
