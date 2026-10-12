import { compareRanges } from "@/code-blocks/source-range"
import type { CodeBlockType } from "@/code-blocks/types"
import { listJourneyNodes } from "@/journey-flow-diagram"
import type { ASTCodeGroupGraph, CodeBlock, JourneyFlowDiagram } from "@flightplan/configurations"
import { listWaypointSteps, type WaypointStep } from "./steps"
import type { LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint, WaypointCategory } from "."

export interface BlockWalkthroughSources {
  readonly group: ASTCodeGroupGraph
  readonly filePaths: readonly string[]
  readonly journeyFlowDiagram: JourneyFlowDiagram | null
  readonly firstWaypointNumber: number
}

interface Stop {
  readonly name: string | null
  readonly lines: readonly [number, number]
  readonly category: WaypointCategory
  readonly rootBlockIds: readonly string[]
  readonly blocks: readonly CodeBlock[]
}

const CATEGORY_BY_TYPE: ReadonlyMap<CodeBlockType, WaypointCategory> = new Map<CodeBlockType, WaypointCategory>([
  ["function", "function"],
  ["hook", "function"],
  ["component", "function"],
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
const READ_IN_PARTS_CATEGORIES: ReadonlySet<WaypointCategory> = new Set<WaypointCategory>(["function", "class", "method", "variable"])
const DEFAULT_CATEGORY: WaypointCategory = "statement"
const STEP_CATEGORY: WaypointCategory = "statement"
const STEP_ID_SEPARATOR = "."
const STEP_NAME_SEPARATOR = " › "
const CLASS: CodeBlockType = "class"
const METHOD: CodeBlockType = "method"
const WAYPOINT_ID_PREFIX = "w"
const NAME_SEPARATOR = ", "
const LINE_DASH = "–"
const KEY_SEPARATOR = ":"

const withAncestors = (block: CodeBlock): CodeBlock[] => (block.parentBlock === null ? [block] : [...withAncestors(block.parentBlock), block])

const uniqueBlocks = (blocks: readonly CodeBlock[]): CodeBlock[] => [...new Set(blocks)]

const linesOf = ({ lineOfCodeRangeReference: [{ start, end }] }: CodeBlock): [number, number] => [start.line, end.line]

const stopOf = (changed: CodeBlock): Stop => {
  const [root, ...nested] = withAncestors(changed)
  const method = root.type === CLASS ? nested.find((holder) => holder.type === METHOD) : undefined
  const stop = method ?? root
  const category = CATEGORY_BY_TYPE.get(stop.type) ?? DEFAULT_CATEGORY
  return { name: stop.name ?? null, lines: linesOf(stop), category, rootBlockIds: [root.id], blocks: uniqueBlocks([stop, changed]) }
}

const keyOf = ({ name, lines, category }: Stop): string => [name ?? "", category, ...lines].join(KEY_SEPARATOR)

const joinChanges = ([first, ...others]: readonly Stop[]): Stop => ({ ...first, blocks: uniqueBlocks([first, ...others].flatMap((stop) => stop.blocks)) })

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
      rootBlockIds: [...new Set([...earlier.rootBlockIds, ...stop.rootBlockIds])],
      blocks: uniqueBlocks([...earlier.blocks, ...stop.blocks]),
    }
    return [...joined.slice(0, -1), merged]
  }, [])

const inWrittenOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => compareRanges(one.lineOfCodeRangeReference[0], two.lineOfCodeRangeReference[0]))

const namedStop = (stop: Stop): Stop & { readonly name: string } => ({ ...stop, name: stop.name ?? `Lines ${stop.lines.map(String).join(LINE_DASH)}` })

const withDistinctNames = (stops: readonly (Stop & { readonly name: string })[]): (Stop & { readonly name: string })[] =>
  stops.map((stop, index) => {
    const earlierCount = stops.slice(0, index).filter((earlier) => earlier.name === stop.name).length
    return earlierCount === 0 ? stop : { ...stop, name: `${stop.name} (${String(earlierCount + 1)})` }
  })

const listStops = (filePath: string, { codeBlocks }: ASTCodeGroupGraph): (Stop & { readonly name: string })[] => {
  const stops = codeBlocks.filter((block) => block.astGraph.filePath === filePath && block.lineOfCodeDiffs !== null).map(stopOf)
  const distinct = [...new Set(stops.map(keyOf))].map((key) => joinChanges(stops.filter((stop) => keyOf(stop) === key)))
  const inLineOrder = [...distinct].sort((one, two) => one.lines[0] - two.lines[0] || one.lines[1] - two.lines[1])
  const joined = joinLoose(inLineOrder).map((stop) => ({ ...stop, blocks: inWrittenOrder(stop.blocks) }))
  return withDistinctNames(joined.map(namedStop))
}

const withDistinctStepNames = (steps: readonly WaypointStep[]): WaypointStep[] =>
  steps.map((step, index) => {
    const earlierCount = steps.slice(0, index).filter((earlier) => earlier.name === step.name).length
    return earlierCount === 0 ? step : { ...step, name: `${step.name} (${String(earlierCount + 1)})` }
  })

const toStepWaypoint = ({ name, lines: [lineStart, lineEnd], blocks, children }: WaypointStep, parent: LinkedWaypoint, position: number): LinkedWaypoint => {
  const waypoint: LinkedWaypoint = {
    id: [parent.id, String(position + 1)].join(STEP_ID_SEPARATOR),
    title: null,
    declaration: [parent.declaration, name].join(STEP_NAME_SEPARATOR),
    codeBlocks: blocks,
    reading: "",
    needsAttention: null,
    findings: [],
    children: [],
    range: { lineStart, lineEnd },
    category: STEP_CATEGORY,
    journeyNodeId: parent.journeyNodeId,
  }
  return withSteps(waypoint, children)
}

const withSteps = (waypoint: LinkedWaypoint, steps: readonly WaypointStep[]): LinkedWaypoint => ({
  ...waypoint,
  children: withDistinctStepNames(steps).map((step, position) => toStepWaypoint(step, waypoint, position)),
})

const listStepsOf = ({ category, blocks: [declarationBlock, ...changedBlocks] }: Stop): readonly WaypointStep[] =>
  READ_IN_PARTS_CATEGORIES.has(category) ? listWaypointSteps(declarationBlock, changedBlocks) : []

export const generateWalkthroughFromBlocks = ({ group, filePaths, journeyFlowDiagram, firstWaypointNumber }: BlockWalkthroughSources): LinkedCodeWalkthrough => {
  const journeyNodeIds = new Set(listJourneyNodes(journeyFlowDiagram?.journeyNodes ?? []).map((node) => node.id))
  const toDeclarationWaypoint = ({ name, lines: [lineStart, lineEnd], category, rootBlockIds, blocks }: Stop & { readonly name: string }, number: number): LinkedWaypoint => ({
    id: `${WAYPOINT_ID_PREFIX}${String(number)}`,
    title: null,
    declaration: name,
    codeBlocks: blocks,
    reading: "",
    needsAttention: null,
    findings: [],
    children: [],
    range: { lineStart, lineEnd },
    category,
    journeyNodeId: rootBlockIds.find((rootBlockId) => journeyNodeIds.has(rootBlockId)) ?? null,
  })
  const files = filePaths.reduce<readonly LinkedFileSection[]>((sections, filePath) => {
    const stops = listStops(filePath, group)
    if (stops.length === 0) return sections
    const waypointCount = sections.reduce((count, section) => count + section.waypoints.length, 0)
    const waypoints = stops.map((stop, index) => withSteps(toDeclarationWaypoint(stop, firstWaypointNumber + waypointCount + index), listStepsOf(stop)))
    return [...sections, { path: filePath, title: filePath, summary: [], waypoints }]
  }, [])
  return { intro: null, files }
}
