import { z } from "zod"
import type { Codegraph, CodegraphSegment, LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint } from "@flightplan/codegraph"
import { IMPACT_TYPES, type Blast, type BlockLabel, type JourneyFlowDiagram, type JourneyNode, type TriggerLabel } from "@flightplan/configurations"

interface WrittenJourneyNode {
  readonly id: string
  readonly label: string | null
  readonly description: string | null
  readonly triggerLabels: readonly { readonly label: string | null, readonly codeBlockId: string }[]
  readonly blockLabels: readonly { readonly label: string | null, readonly codeBlockId: string }[]
  readonly children: readonly WrittenJourneyNode[]
}

const writtenJourneyNodeSchema: z.ZodType<WrittenJourneyNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    triggerLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })).default([]),
    blockLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })).default([]),
    children: z.array(writtenJourneyNodeSchema).default([]),
  }),
)

const writtenBlastNodeSchema = z.object({
  path: z.string(),
  impactType: z.enum(IMPACT_TYPES).nullable(),
  impactReason: z.string().nullable(),
})

interface WrittenWaypoint {
  readonly declaration: string
  readonly title: string | null
  readonly reading: string
  readonly needsAttention: string | null
  readonly children: readonly WrittenWaypoint[]
}

const writtenWaypointSchema: z.ZodType<WrittenWaypoint> = z.lazy(() =>
  z.object({
    declaration: z.string(),
    title: z.string().nullable(),
    reading: z.string(),
    needsAttention: z.string().nullable(),
    children: z.array(writtenWaypointSchema),
  }),
)

const writtenFileSchema = z.object({
  path: z.string(),
  title: z.string(),
  summary: z.array(z.string()),
  waypoints: z.array(writtenWaypointSchema),
})

const writtenSegmentSchema = z.object({
  title: z.string().nullable(),
  journeyFlowDiagram: z.object({ journeyNodes: z.array(writtenJourneyNodeSchema).default([]) }).nullable(),
  blastRadiusDiagram: z.object({ nodes: z.array(z.unknown()) }).nullable().optional(),
  codeWalkthrough: z.object({ intro: z.string().nullable(), files: z.array(writtenFileSchema) }),
})

const writtenPartsSchema = z.object({
  context: z.array(z.string()),
  codegraph: z.object({ segments: z.array(writtenSegmentSchema) }),
})

export type WrittenParts = z.infer<typeof writtenPartsSchema>

type WrittenSegment = z.infer<typeof writtenSegmentSchema>
type WrittenJourney = NonNullable<WrittenSegment["journeyFlowDiagram"]>
type WrittenFile = z.infer<typeof writtenFileSchema>

export const NOTHING_WRITTEN: WrittenParts = { context: [], codegraph: { segments: [] } }

export const readWrittenParts = (snapshot: unknown): WrittenParts => {
  const written = writtenPartsSchema.safeParse(snapshot)
  return written.success ? written.data : NOTHING_WRITTEN
}

const listWrittenJourneyNodes = (nodes: readonly WrittenJourneyNode[]): WrittenJourneyNode[] =>
  nodes.flatMap((node) => [node, ...listWrittenJourneyNodes(node.children)])

const withWrittenTriggerLabel = (trigger: TriggerLabel, written: WrittenJourneyNode): TriggerLabel => {
  const writtenTrigger = written.triggerLabels.find((one) => one.codeBlockId === trigger.codeBlock.id)
  return writtenTrigger === undefined ? trigger : { ...trigger, label: writtenTrigger.label }
}

const withWrittenBlockLabel = (listed: BlockLabel, written: WrittenJourneyNode): BlockLabel => {
  const writtenBlock = written.blockLabels.find((one) => one.codeBlockId === listed.codeBlock.id)
  return writtenBlock === undefined ? listed : { ...listed, label: writtenBlock.label }
}

const withWrittenJourneyNode = (node: JourneyNode, writtenById: ReadonlyMap<string, WrittenJourneyNode>): JourneyNode => {
  const written = writtenById.get(node.id)
  const children = node.children.map((child) => withWrittenJourneyNode(child, writtenById))
  return written === undefined
    ? { ...node, children }
    : {
        ...node,
        label: written.label,
        description: written.description,
        triggerLabels: node.triggerLabels.map((trigger) => withWrittenTriggerLabel(trigger, written)),
        blockLabels: node.blockLabels.map((listed) => withWrittenBlockLabel(listed, written)),
        children,
      }
}

const withWrittenJourney = (journey: JourneyFlowDiagram | null, written: WrittenJourney | null | undefined): JourneyFlowDiagram | null => {
  if (journey === null || written === null || written === undefined) return journey
  const writtenById = new Map(listWrittenJourneyNodes(written.journeyNodes).map((node) => [node.id, node]))
  return { ...journey, journeyNodes: journey.journeyNodes.map((node) => withWrittenJourneyNode(node, writtenById)) }
}

const withWrittenBlast = (blast: Blast | null, written: WrittenSegment["blastRadiusDiagram"]): Blast | null => {
  if (written === undefined || written === null || blast === null) return blast
  const writtenNodes = new Map(
    written.nodes.flatMap((node) => {
      const writtenNode = writtenBlastNodeSchema.safeParse(node)
      return writtenNode.success ? [[writtenNode.data.path, writtenNode.data] as const] : []
    }),
  )
  return {
    ...blast,
    nodes: blast.nodes.map((node) => {
      const writtenNode = writtenNodes.get(node.path)
      return writtenNode === undefined || node.diffType !== null
        ? node
        : { ...node, impactType: writtenNode.impactType, impactReason: writtenNode.impactReason }
    }),
  }
}

const listWrittenWaypoints = (waypoints: readonly WrittenWaypoint[]): WrittenWaypoint[] =>
  waypoints.flatMap((waypoint) => [waypoint, ...listWrittenWaypoints(waypoint.children)])

const withWrittenWaypoint = (waypoint: LinkedWaypoint, writtenWaypoints: ReadonlyMap<string, WrittenWaypoint>): LinkedWaypoint => {
  const written = writtenWaypoints.get(waypoint.declaration)
  const children = waypoint.children.map((child) => withWrittenWaypoint(child, writtenWaypoints))
  return written === undefined
    ? { ...waypoint, children }
    : { ...waypoint, title: written.title, reading: written.reading, needsAttention: written.needsAttention, children }
}

const withWrittenFile = (file: LinkedFileSection, written: WrittenFile | undefined): LinkedFileSection => {
  if (written === undefined) return file
  const writtenWaypoints = new Map(listWrittenWaypoints(written.waypoints).map((waypoint) => [waypoint.declaration, waypoint]))
  return {
    ...file,
    title: written.title,
    summary: written.summary,
    waypoints: file.waypoints.map((waypoint) => withWrittenWaypoint(waypoint, writtenWaypoints)),
  }
}

const withWrittenWalkthrough = (
  walkthrough: LinkedCodeWalkthrough,
  written: WrittenSegment["codeWalkthrough"] | undefined,
): LinkedCodeWalkthrough => {
  if (written === undefined) return walkthrough
  const writtenFiles = new Map(written.files.map((file) => [file.path, file]))
  return {
    ...walkthrough,
    intro: written.intro,
    files: walkthrough.files.map((file) => withWrittenFile(file, writtenFiles.get(file.path))),
  }
}

const withWrittenSegment = (segment: CodegraphSegment, written: WrittenSegment | undefined): CodegraphSegment =>
  written === undefined
    ? segment
    : {
        ...segment,
        title: written.title,
        journeyFlowDiagram: withWrittenJourney(segment.journeyFlowDiagram, written.journeyFlowDiagram),
        blastRadiusDiagram: withWrittenBlast(segment.blastRadiusDiagram, written.blastRadiusDiagram),
        codeWalkthrough: withWrittenWalkthrough(segment.codeWalkthrough, written.codeWalkthrough),
      }

export const withWrittenParts = (codegraph: Codegraph, written: WrittenParts): Codegraph => ({
  ...codegraph,
  segments: codegraph.segments.map((segment, position) => withWrittenSegment(segment, written.codegraph.segments.at(position))),
})
