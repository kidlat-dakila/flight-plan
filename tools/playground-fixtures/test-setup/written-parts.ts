import { z } from "zod"
import type { Codegraph, CodegraphSegment, LinkedCodeWalkthrough, LinkedFileSection, LinkedWaypoint } from "@flightplan/codegraph"
import { artifactFindingSchema, IMPACT_TYPES, type Blast, type BlockLabel, type Finding, type TraceDiagram, type TraceNode, type TriggerLabel } from "@flightplan/configurations"

interface WrittenTraceNode {
  readonly id: string
  readonly label: string | null
  readonly description: string | null
  readonly triggerLabels: readonly { readonly label: string | null, readonly codeBlockId: string }[]
  readonly blockLabels: readonly { readonly label: string | null, readonly codeBlockId: string }[]
  readonly children: readonly WrittenTraceNode[]
}

const writtenTraceNodeSchema: z.ZodType<WrittenTraceNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    triggerLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })).default([]),
    blockLabels: z.array(z.object({ label: z.string().nullable(), codeBlockId: z.string() })).default([]),
    children: z.array(writtenTraceNodeSchema).default([]),
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
  readonly coreChange: string | null
  readonly findings: readonly Finding[]
  readonly children: readonly WrittenWaypoint[]
}

const writtenWaypointSchema: z.ZodType<WrittenWaypoint> = z.lazy(() =>
  z.object({
    declaration: z.string(),
    title: z.string().nullable(),
    reading: z.string(),
    coreChange: z.string().nullable(),
    findings: z.array(artifactFindingSchema).default([]),
    children: z.array(writtenWaypointSchema),
  }),
)

const writtenFileSchema = z.object({
  path: z.string(),
  waypoints: z.array(writtenWaypointSchema),
})

const writtenSegmentSchema = z.object({
  title: z.string().nullable(),
  context: z.array(z.string()).default([]),
  traceDiagram: z.object({ title: z.string().nullable().default(null), description: z.string().nullable().default(null), traceNodes: z.array(writtenTraceNodeSchema).default([]) }).nullable(),
  blastDiagram: z.object({ nodes: z.array(z.unknown()) }).nullable().optional(),
  codeWalkthrough: z.object({ files: z.array(writtenFileSchema) }),
})

const writtenPartsSchema = z.object({
  codegraph: z.object({ segments: z.array(writtenSegmentSchema) }),
})

export type WrittenParts = z.infer<typeof writtenPartsSchema>

type WrittenSegment = z.infer<typeof writtenSegmentSchema>
type WrittenTrace = NonNullable<WrittenSegment["traceDiagram"]>
type WrittenFile = z.infer<typeof writtenFileSchema>

export const NOTHING_WRITTEN: WrittenParts = { codegraph: { segments: [] } }

const NO_CONTEXT: readonly string[] = []

export const readWrittenParts = (snapshot: unknown): WrittenParts => {
  const written = writtenPartsSchema.safeParse(snapshot)
  return written.success ? written.data : NOTHING_WRITTEN
}

export const writtenContextAt = (written: WrittenParts, position: number): readonly string[] =>
  written.codegraph.segments.at(position)?.context ?? NO_CONTEXT

const listWrittenTraceNodes = (nodes: readonly WrittenTraceNode[]): WrittenTraceNode[] =>
  nodes.flatMap((node) => [node, ...listWrittenTraceNodes(node.children)])

const withWrittenTriggerLabel = (trigger: TriggerLabel, written: WrittenTraceNode): TriggerLabel => {
  const writtenTrigger = written.triggerLabels.find((one) => one.codeBlockId === trigger.codeBlock.id)
  return writtenTrigger === undefined ? trigger : { ...trigger, label: writtenTrigger.label }
}

const withWrittenBlockLabel = (listed: BlockLabel, written: WrittenTraceNode): BlockLabel => {
  const writtenBlock = written.blockLabels.find((one) => one.codeBlockId === listed.codeBlock.id)
  return writtenBlock === undefined ? listed : { ...listed, label: writtenBlock.label }
}

const withWrittenTraceNode = (node: TraceNode, writtenById: ReadonlyMap<string, WrittenTraceNode>): TraceNode => {
  const written = writtenById.get(node.id)
  const children = node.children.map((child) => withWrittenTraceNode(child, writtenById))
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

const withWrittenTrace = (traceDiagram: TraceDiagram | null, written: WrittenTrace | null | undefined): TraceDiagram | null => {
  if (traceDiagram === null || written === null || written === undefined) return traceDiagram
  const writtenById = new Map(listWrittenTraceNodes(written.traceNodes).map((node) => [node.id, node]))
  return { ...traceDiagram, title: written.title, description: written.description, traceNodes: traceDiagram.traceNodes.map((node) => withWrittenTraceNode(node, writtenById)) }
}

const withWrittenBlast = (blastDiagram: Blast | null, written: WrittenSegment["blastDiagram"]): Blast | null => {
  if (written === undefined || written === null || blastDiagram === null) return blastDiagram
  const writtenNodes = new Map(
    written.nodes.flatMap((node) => {
      const writtenNode = writtenBlastNodeSchema.safeParse(node)
      return writtenNode.success ? [[writtenNode.data.path, writtenNode.data] as const] : []
    }),
  )
  return {
    ...blastDiagram,
    nodes: blastDiagram.nodes.map((node) => {
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
    : { ...waypoint, title: written.title, reading: written.reading, coreChange: written.coreChange, findings: written.findings, children }
}

const withWrittenFile = (file: LinkedFileSection, written: WrittenFile | undefined): LinkedFileSection => {
  if (written === undefined) return file
  const writtenWaypoints = new Map(listWrittenWaypoints(written.waypoints).map((waypoint) => [waypoint.declaration, waypoint]))
  return { ...file, waypoints: file.waypoints.map((waypoint) => withWrittenWaypoint(waypoint, writtenWaypoints)) }
}

const withWrittenWalkthrough = (
  walkthrough: LinkedCodeWalkthrough,
  written: WrittenSegment["codeWalkthrough"] | undefined,
): LinkedCodeWalkthrough => {
  if (written === undefined) return walkthrough
  const writtenFiles = new Map(written.files.map((file) => [file.path, file]))
  return {
    ...walkthrough,
    files: walkthrough.files.map((file) => withWrittenFile(file, writtenFiles.get(file.path))),
  }
}

const withWrittenSegment = (segment: CodegraphSegment, written: WrittenSegment | undefined): CodegraphSegment =>
  written === undefined
    ? segment
    : {
        ...segment,
        title: written.title,
        traceDiagram: withWrittenTrace(segment.traceDiagram, written.traceDiagram),
        blastDiagram: withWrittenBlast(segment.blastDiagram, written.blastDiagram),
        codeWalkthrough: withWrittenWalkthrough(segment.codeWalkthrough, written.codeWalkthrough),
      }

export const withWrittenParts = (codegraph: Codegraph, written: WrittenParts): Codegraph => ({
  ...codegraph,
  segments: codegraph.segments.map((segment, position) => withWrittenSegment(segment, written.codegraph.segments.at(position))),
})
