import { z } from "zod"
import type { Codegraph, CodegraphSegment, LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint } from "@flightplan/codegraph"
import { GENERATED_NODE_CATEGORIES, IMPACT_TYPES, NODE_CATEGORIES, type Blast, type ComponentReturn, type JourneyFlow, type JourneyNode, type NodeCategory } from "@flightplan/configurations"

const writtenReturnSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
})

const writtenJourneyNodeSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  category: z.enum(NODE_CATEGORIES).optional(),
  returns: z.array(writtenReturnSchema).default([]),
})

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
  journeyFlowDiagram: z.object({ title: z.string(), nodes: z.array(writtenJourneyNodeSchema) }).nullable(),
  blastRadiusDiagram: z.object({ nodes: z.array(z.unknown()) }).optional(),
  codeWalkthrough: z.object({ intro: z.string().nullable(), files: z.array(writtenFileSchema) }),
})

const writtenPartsSchema = z.object({
  context: z.array(z.string()),
  codegraph: z.object({ segments: z.array(writtenSegmentSchema) }),
})

export type WrittenParts = z.infer<typeof writtenPartsSchema>

type WrittenSegment = z.infer<typeof writtenSegmentSchema>
type WrittenJourney = NonNullable<WrittenSegment["journeyFlowDiagram"]>
type WrittenJourneyNode = z.infer<typeof writtenJourneyNodeSchema>
type WrittenFile = z.infer<typeof writtenFileSchema>

export const NOTHING_WRITTEN: WrittenParts = { context: [], codegraph: { segments: [] } }

export const readWrittenParts = (snapshot: unknown): WrittenParts => {
  const written = writtenPartsSchema.safeParse(snapshot)
  return written.success ? written.data : NOTHING_WRITTEN
}

const isGenerated = (category: NodeCategory): boolean => GENERATED_NODE_CATEGORIES.includes(category)

const writtenCategoryOf = (generated: NodeCategory, written: NodeCategory | undefined): NodeCategory =>
  written === undefined || isGenerated(generated) || isGenerated(written) ? generated : written

const withWrittenReturn = (componentReturn: ComponentReturn, written: WrittenJourneyNode["returns"][number] | undefined): ComponentReturn =>
  written === undefined ? componentReturn : { ...componentReturn, label: written.label, description: written.description }

const withWrittenJourneyNode = (node: JourneyNode, written: WrittenJourneyNode | undefined): JourneyNode => {
  if (written === undefined) return node
  if (node.kind === "entry-point") return { ...node, label: written.label ?? node.label, description: written.description }
  const writtenReturns = new Map(written.returns.map((componentReturn) => [componentReturn.id, componentReturn]))
  return {
    ...node,
    category: writtenCategoryOf(node.category, written.category),
    label: written.label,
    description: written.description,
    returns: node.returns.map((componentReturn) => withWrittenReturn(componentReturn, writtenReturns.get(componentReturn.id))),
  }
}

const withWrittenJourney = (journey: JourneyFlow | null, written: WrittenJourney | null | undefined): JourneyFlow | null => {
  if (journey === null || written === null || written === undefined) return journey
  const writtenNodes = new Map(written.nodes.map((node) => [node.id, node]))
  return {
    ...journey,
    title: written.title,
    nodes: journey.nodes.map((node) => withWrittenJourneyNode(node, writtenNodes.get(node.id))),
  }
}

const withWrittenBlast = (blast: Blast, written: WrittenSegment["blastRadiusDiagram"]): Blast => {
  if (written === undefined) return blast
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
