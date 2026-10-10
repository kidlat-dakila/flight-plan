import { usageNodeIdOf } from "@/ast-graph/usage-graph"
import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { CodeBlockType } from "@/code-blocks/types"
import { JOURNEY_TOP_LEVEL_NAME } from "@/journey-flow-diagram"
import type { JourneyFlow } from "@flightplan/configurations"
import type { LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint, WaypointCategory } from "."

export interface BlockWalkthroughSources {
  readonly group: StoredCodeGroupGraph
  readonly filePaths: readonly string[]
  readonly journeyFlowDiagram: JourneyFlow | null
  readonly firstWaypointNumber: number
}

interface Stop {
  readonly name: string | null
  readonly lines: readonly [number, number]
  readonly category: WaypointCategory
  readonly nodeNames: readonly string[]
}

type BlockById = ReadonlyMap<string, StoredCodeBlock>

const CATEGORY_BY_TYPE: ReadonlyMap<CodeBlockType, WaypointCategory> = new Map<CodeBlockType, WaypointCategory>([
  ["function", "function"],
  ["hook", "function"],
  ["class", "class"],
  ["method", "method"],
  ["root-variable", "variable"],
  ["state", "variable"],
  ["derived", "variable"],
  ["import", "import"],
  ["type-declaration", "type"],
  ["root-statement", "statement"],
  ["file", "file"],
])
const LOOSE_CATEGORIES: ReadonlySet<WaypointCategory> = new Set<WaypointCategory>(["import", "type", "statement"])
const DEFAULT_CATEGORY: WaypointCategory = "statement"
const CLASS: CodeBlockType = "class"
const METHOD: CodeBlockType = "method"
const WAYPOINT_ID_PREFIX = "w"
const NAME_SEPARATOR = ", "
const LINE_DASH = "–"
const KEY_SEPARATOR = ":"

const withAncestors = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block] : [...withAncestors(parent, blockById), block]
}

const linesOf = ({ lineOfCodeRangeReference: [{ start, end }] }: StoredCodeBlock): [number, number] => [start.line, end.line]

const stopOf = (changed: StoredCodeBlock, blockById: BlockById): Stop => {
  const [root, ...nested] = withAncestors(changed, blockById)
  const method = root.type === CLASS ? nested.find((holder) => holder.type === METHOD) : undefined
  const stop = method ?? root
  const category = CATEGORY_BY_TYPE.get(stop.type) ?? DEFAULT_CATEGORY
  const nodeNames = [stop.name ?? "", root.name ?? "", ...(category === "statement" ? [JOURNEY_TOP_LEVEL_NAME] : [])]
  return { name: stop.name ?? null, lines: linesOf(stop), category, nodeNames: nodeNames.filter((name) => name !== "") }
}

const keyOf = ({ name, lines, category }: Stop): string => [name ?? "", category, ...lines].join(KEY_SEPARATOR)

const isJoining = (earlier: Stop, later: Stop): boolean =>
  LOOSE_CATEGORIES.has(later.category) && earlier.category === later.category && later.lines[0] <= earlier.lines[1] + 1

const joinLoose = (stops: readonly Stop[]): Stop[] =>
  stops.reduce<Stop[]>((joined, stop) => {
    const earlier = joined.length === 0 ? undefined : joined[joined.length - 1]
    if (earlier === undefined || !isJoining(earlier, stop)) return [...joined, stop]
    const names = [earlier.name, stop.name].filter((name) => name !== null)
    const merged: Stop = {
      name: names.length === 0 ? null : names.join(NAME_SEPARATOR),
      lines: [earlier.lines[0], Math.max(earlier.lines[1], stop.lines[1])],
      category: earlier.category,
      nodeNames: [...new Set([...earlier.nodeNames, ...stop.nodeNames])],
    }
    return [...joined.slice(0, -1), merged]
  }, [])

const namedStop = (stop: Stop): Stop & { readonly name: string } => ({ ...stop, name: stop.name ?? `Lines ${stop.lines.map(String).join(LINE_DASH)}` })

const withDistinctNames = (stops: readonly (Stop & { readonly name: string })[]): (Stop & { readonly name: string })[] =>
  stops.map((stop, index) => {
    const earlierCount = stops.slice(0, index).filter((earlier) => earlier.name === stop.name).length
    return earlierCount === 0 ? stop : { ...stop, name: `${stop.name} (${String(earlierCount + 1)})` }
  })

const listStops = (filePath: string, { codeBlocks }: StoredCodeGroupGraph, blockById: BlockById): (Stop & { readonly name: string })[] => {
  const stops = codeBlocks.filter((block) => block.filePath === filePath && block.lineOfCodeDiffs !== null).map((block) => stopOf(block, blockById))
  const distinct = [...new Set(stops.map(keyOf))].flatMap((key) => stops.filter((stop) => keyOf(stop) === key).slice(0, 1))
  const inLineOrder = [...distinct].sort((one, two) => one.lines[0] - two.lines[0] || one.lines[1] - two.lines[1])
  return withDistinctNames(joinLoose(inLineOrder).map(namedStop))
}

export const generateWalkthroughFromBlocks = ({ group, filePaths, journeyFlowDiagram, firstWaypointNumber }: BlockWalkthroughSources): LinkedCodeWalkthrough => {
  const blockById: BlockById = new Map(group.codeBlocks.map((block) => [block.id, block] as const))
  const journeyNodeIds = new Set(journeyFlowDiagram?.nodes.map((node) => node.id))
  const toWaypoint = (filePath: string, { name, lines: [lineStart, lineEnd], category, nodeNames }: Stop & { readonly name: string }, number: number): LinkedWaypoint => ({
    id: `${WAYPOINT_ID_PREFIX}${String(number)}`,
    title: null,
    declaration: name,
    reading: "",
    needsAttention: null,
    findings: [],
    children: [],
    range: { lineStart, lineEnd },
    category,
    journeyFlowId: journeyFlowDiagram?.id ?? null,
    journeyNodeId: nodeNames.map((nodeName) => usageNodeIdOf(filePath, nodeName)).find((id) => journeyNodeIds.has(id)) ?? null,
  })
  const files = filePaths.reduce<readonly LinkedFileSection[]>((sections, filePath) => {
    const stops = listStops(filePath, group, blockById)
    if (stops.length === 0) return sections
    const waypointCount = sections.reduce((count, section) => count + section.waypoints.length, 0)
    const waypoints = stops.map((stop, index) => toWaypoint(filePath, stop, firstWaypointNumber + waypointCount + index))
    return [...sections, { path: filePath, title: filePath, summary: [], waypoints }]
  }, [])
  return { intro: null, files }
}
