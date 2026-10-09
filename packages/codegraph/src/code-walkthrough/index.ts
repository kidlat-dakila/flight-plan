import {
  looseNameOf,
  usageNodeIdOf,
  type BaseASTGraphFile,
  type DiffLocation,
  type EncapsulationKind,
  type LineRange as Lines,
} from "@/ast-graph"
import { JOURNEY_TOP_LEVEL_NAME } from "@/journey-flow-diagram"
import type { CodeWalkthrough, FileSection, JourneyFlow, LineRange, Waypoint } from "@flightplan/configurations"

export type WaypointCategory = EncapsulationKind | "import" | "type" | "statement"

export interface LinkedWaypoint extends Waypoint {
  readonly range: LineRange
  readonly category: WaypointCategory
  readonly journeyFlowId: string | null
  readonly journeyNodeId: string | null
  readonly children: readonly LinkedWaypoint[]
}

export interface LinkedFileSection extends FileSection {
  readonly waypoints: readonly LinkedWaypoint[]
}

export interface LinkedCodeWalkthrough extends CodeWalkthrough {
  readonly files: readonly LinkedFileSection[]
}

export interface CodeWalkthroughSources {
  readonly astGraphFiles: readonly BaseASTGraphFile[]
  readonly journeyFlowDiagram: JourneyFlow | null
  readonly firstWaypointNumber?: number
}

interface Stop {
  readonly name: string
  readonly lines: Lines
  readonly category: WaypointCategory
  readonly nodeIds: readonly string[]
}

interface Links {
  readonly journeyFlowId: string | null
  readonly journeyNodeIds: ReadonlySet<string>
}

const NAME_SEPARATOR = "."
const CONTAINER_KIND: EncapsulationKind = "class"
const WAYPOINT_ID_PREFIX = "w"
const FIRST_WAYPOINT_NUMBER = 1

const namedPath = (names: readonly string[]): string => names.join(NAME_SEPARATOR)

const stopOfLocation = (file: BaseASTGraphFile, { parentEncapsulation }: DiffLocation): Stop[] => {
  const path = file.listEncapsulationPath(parentEncapsulation)
  const names = path.map((holder) => holder.name)
  const callableIndex = path.findIndex((holder) => holder.kind !== CONTAINER_KIND)
  const stopIndex = callableIndex === -1 ? path.length - 1 : callableIndex
  if (stopIndex < 0) return []
  const stop = path[stopIndex]
  const nodeNames = path.slice(stopIndex).map((_holder, depth) => namedPath(names.slice(0, stopIndex + depth + 1)))
  return [
    {
      name: namedPath(names.slice(0, stopIndex + 1)),
      lines: [stop.range.start.line, stop.range.end.line],
      category: stop.kind,
      nodeIds: [...nodeNames, names[0]].map((name) => usageNodeIdOf(file.filePath, name)),
    },
  ]
}

const isWithin = (line: number, [startLine, endLine]: Lines): boolean => startLine <= line && line <= endLine

const looseCategoryOf = (file: BaseASTGraphFile, lines: Lines): WaypointCategory => {
  if (file.listImportVariables().some((variable) => isWithin(variable.range.start.line, lines))) return "import"
  const hasType = file.listFileVariables().some((variable) => variable.type === "type" && isWithin(variable.range.start.line, lines))
  return hasType ? "type" : "statement"
}

const stopOfLooseLines = (file: BaseASTGraphFile, lines: Lines): Stop => {
  const name = looseNameOf({ file, lines })
  const category = looseCategoryOf(file, lines)
  const names = category === "statement" ? [name, JOURNEY_TOP_LEVEL_NAME] : [name]
  return { name, lines, category, nodeIds: names.map((nodeName) => usageNodeIdOf(file.filePath, nodeName)) }
}

const stopKey = ({ name, lines }: Stop): string => [name, ...lines].join(NAME_SEPARATOR)

const joinStops = (stops: readonly Stop[]): Stop[] => {
  const keys = [...new Set(stops.map(stopKey))]
  return keys.map((key) => {
    const same = stops.filter((stop) => stopKey(stop) === key)
    return { ...same[0], nodeIds: [...new Set(same.flatMap((stop) => stop.nodeIds))] }
  })
}

const withDistinctNames = (stops: readonly Stop[]): Stop[] =>
  stops.map((stop, index) => {
    const earlierCount = stops.slice(0, index).filter((earlier) => earlier.name === stop.name).length
    return earlierCount === 0 ? stop : { ...stop, name: `${stop.name} (${String(earlierCount + 1)})` }
  })

const listStops = (file: BaseASTGraphFile): Stop[] => {
  const located = file.listDiffLocations().flatMap((location) => stopOfLocation(file, location))
  const loose = file.listLooseDiffLines().map((lines) => stopOfLooseLines(file, lines))
  return withDistinctNames([...joinStops([...located, ...loose])].sort((one, two) => one.lines[0] - two.lines[0]))
}

const toWaypoint = ({ name, lines: [lineStart, lineEnd], category, nodeIds }: Stop, number: number, links: Links): LinkedWaypoint => {
  const journeyNodeId = nodeIds.find((id) => links.journeyNodeIds.has(id)) ?? null
  return {
    id: `${WAYPOINT_ID_PREFIX}${String(number)}`,
    title: null,
    declaration: name,
    reading: "",
    needsAttention: null,
    findings: [],
    children: [],
    range: { lineStart, lineEnd },
    category,
    journeyFlowId: links.journeyFlowId,
    journeyNodeId,
  }
}

const addFileSection = (file: BaseASTGraphFile, sections: readonly LinkedFileSection[], firstNumber: number, links: Links): readonly LinkedFileSection[] => {
  const stops = listStops(file)
  if (stops.length === 0) return sections
  const waypointCount = sections.reduce((count, section) => count + section.waypoints.length, 0)
  const waypoints = stops.map((stop, index) => toWaypoint(stop, firstNumber + waypointCount + index, links))
  return [...sections, { path: file.filePath, title: file.filePath, summary: [], waypoints }]
}

export const generateCodeWalkthrough = ({
  astGraphFiles,
  journeyFlowDiagram,
  firstWaypointNumber = FIRST_WAYPOINT_NUMBER,
}: CodeWalkthroughSources): LinkedCodeWalkthrough => {
  const links: Links = {
    journeyFlowId: journeyFlowDiagram?.id ?? null,
    journeyNodeIds: new Set(journeyFlowDiagram?.nodes.map((node) => node.id)),
  }
  const files = astGraphFiles.reduce<readonly LinkedFileSection[]>(
    (sections, file) => addFileSection(file, sections, firstWaypointNumber, links),
    [],
  )
  return { intro: null, files }
}
