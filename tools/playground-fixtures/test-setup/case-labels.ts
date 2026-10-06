import type { Codegraph, CodegraphSegment, LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint } from "@flightplan/codegraph"
import type { Blast, BlastNode, Contract, JourneyFlow, JourneyNode, NodeCategory, Verdict } from "@flightplan/configurations"

export interface JourneyNodeLabels {
  readonly label?: string
  readonly description?: string
  readonly category?: NodeCategory
}

export interface JourneyLabels {
  readonly title?: string
  readonly nodes?: Readonly<Record<string, JourneyNodeLabels>>
}

export interface BlastNodeLabels {
  readonly label?: string
  readonly contract?: Contract
  readonly verdict?: Verdict
  readonly effect?: string
}

export interface BlastLabels {
  readonly nodes?: Readonly<Record<string, BlastNodeLabels>>
}

export interface WaypointLabels {
  readonly title?: string
  readonly reading?: string
  readonly needsAttention?: string
}

export interface FileLabels {
  readonly title?: string
  readonly summary?: readonly string[]
  readonly waypoints?: Readonly<Record<string, WaypointLabels>>
}

export interface WalkthroughLabels {
  readonly intro?: string
  readonly files?: Readonly<Record<string, FileLabels>>
}

export interface SegmentLabels {
  readonly title: string
  readonly journeyFlowDiagram?: JourneyLabels
  readonly blastRadiusDiagram?: BlastLabels
  readonly codeWalkthrough?: WalkthroughLabels
}

export class SegmentCountError extends Error {
  public constructor(labelledCount: number, segmentCount: number) {
    super(`The case labels ${String(labelledCount)} segments, and its codegraph has ${String(segmentCount)}.`)
    this.name = "SegmentCountError"
  }
}

export class UnknownLabelTargetError extends Error {
  public constructor(what: string, keys: readonly string[]) {
    super(`The case labels ${what} the codegraph does not have: ${keys.join(", ")}.`)
    this.name = "UnknownLabelTargetError"
  }
}

const refuseUnknown = (what: string, labelled: object | undefined, known: readonly string[]): void => {
  const unknown = Object.keys(labelled ?? {}).filter((key) => !known.includes(key))
  if (unknown.length > 0) throw new UnknownLabelTargetError(what, unknown)
}

const labelJourneyNode = (node: JourneyNode, labels: JourneyNodeLabels | undefined): JourneyNode => {
  if (labels === undefined) return node
  const description = labels.description ?? node.description
  return node.kind === "declaration"
    ? { ...node, label: labels.label ?? node.label, description, category: labels.category ?? node.category }
    : { ...node, label: labels.label ?? node.label, description }
}

const labelJourney = (journey: JourneyFlow | null, labels: JourneyLabels | undefined): JourneyFlow | null => {
  if (labels === undefined) return journey
  if (journey === null) throw new UnknownLabelTargetError("a Journey Flow Diagram", ["journeyFlowDiagram"])
  refuseUnknown("journey nodes", labels.nodes, journey.nodes.map((node) => node.id))
  return {
    ...journey,
    title: labels.title ?? journey.title,
    nodes: journey.nodes.map((node) => labelJourneyNode(node, labels.nodes?.[node.id])),
  }
}

const labelBlastNode = (node: BlastNode, labels: BlastNodeLabels | undefined): BlastNode =>
  labels === undefined
    ? node
    : {
        ...node,
        label: labels.label ?? node.label,
        contract: labels.contract ?? node.contract,
        verdict: labels.verdict ?? node.verdict,
        effect: labels.effect ?? node.effect,
      }

const labelBlast = (blast: Blast, labels: BlastLabels | undefined): Blast => {
  if (labels === undefined) return blast
  refuseUnknown("blast nodes", labels.nodes, blast.nodes.map((node) => node.id))
  return { ...blast, nodes: blast.nodes.map((node) => labelBlastNode(node, labels.nodes?.[node.id])) }
}

const declarationsIn = (waypoints: readonly LinkedWaypoint[]): string[] =>
  waypoints.flatMap((waypoint) => [waypoint.declaration, ...declarationsIn(waypoint.children)])

const labelWaypoint = (waypoint: LinkedWaypoint, labels: FileLabels["waypoints"]): LinkedWaypoint => {
  const written = labels?.[waypoint.declaration]
  return {
    ...waypoint,
    title: written?.title ?? waypoint.title,
    reading: written?.reading ?? waypoint.reading,
    needsAttention: written?.needsAttention ?? waypoint.needsAttention,
    children: waypoint.children.map((child) => labelWaypoint(child, labels)),
  }
}

const labelFile = (file: LinkedFileSection, labels: FileLabels | undefined): LinkedFileSection => {
  if (labels === undefined) return file
  refuseUnknown(`waypoints of ${file.path}`, labels.waypoints, declarationsIn(file.waypoints))
  return {
    ...file,
    title: labels.title ?? file.title,
    summary: labels.summary ?? file.summary,
    waypoints: file.waypoints.map((waypoint) => labelWaypoint(waypoint, labels.waypoints)),
  }
}

const labelWalkthrough = (walkthrough: LinkedCodeWalkthrough, labels: WalkthroughLabels | undefined): LinkedCodeWalkthrough => {
  if (labels === undefined) return walkthrough
  refuseUnknown("walkthrough files", labels.files, walkthrough.files.map((file) => file.path))
  return {
    ...walkthrough,
    intro: labels.intro ?? walkthrough.intro,
    files: walkthrough.files.map((file) => labelFile(file, labels.files?.[file.path])),
  }
}

const labelSegment = (segment: CodegraphSegment, labels: SegmentLabels): CodegraphSegment => ({
  ...segment,
  title: labels.title,
  journeyFlowDiagram: labelJourney(segment.journeyFlowDiagram, labels.journeyFlowDiagram),
  blastRadiusDiagram: labelBlast(segment.blastRadiusDiagram, labels.blastRadiusDiagram),
  codeWalkthrough: labelWalkthrough(segment.codeWalkthrough, labels.codeWalkthrough),
})

export const labelCodegraph = (codegraph: Codegraph, labels: readonly SegmentLabels[] | undefined): Codegraph => {
  if (labels === undefined) return codegraph
  if (labels.length !== codegraph.segments.length) throw new SegmentCountError(labels.length, codegraph.segments.length)
  return { ...codegraph, segments: codegraph.segments.map((segment, index) => labelSegment(segment, labels[index])) }
}
