import { contextIdOf, listTraceNodes, listReachedPaths, listUnassessedNodes } from "@flightplan/codegraph"
import type { Blast, TraceNode, ReviewArtifact, Segment, SectionSwitches } from "@flightplan/configurations"
import { waypointsOf } from "./artifact-walk"
import { isDescriptionOwed } from "./context-code-blocks"

export const WORK_KINDS = [
  "impact",
  "context",
  "segment-title",
  "title",
  "reading",
  "label",
  "trigger-label",
  "block-label",
  "trace-description",
  "solution",
  "context-description",
] as const

export type WorkKind = (typeof WORK_KINDS)[number]

export type WorkTarget = "blast-node" | "context" | "waypoint" | "trace-node" | "trace-diagram" | "context-code-block"

export interface Work {
  readonly target: WorkTarget
  readonly id: string | null
  readonly segmentId: string | null
  readonly needs: WorkKind
  readonly message: string
}

export interface NodeTally {
  readonly complete: number
  readonly incomplete: number
}

export interface WorkTally {
  readonly total: number
  readonly byKind: Readonly<Record<string, number>>
}

const QUESTION_KIND = "question"

const blastWork = (segment: Segment): Work[] =>
  segment.blastDiagram === null
    ? []
    : listUnassessedNodes(segment.blastDiagram).filter((node) => node.isRequired).map((node) => ({
        target: "blast-node",
        id: node.path,
        segmentId: segment.id,
        needs: "impact",
        message: `\`${node.path}\` imports the changed code and nobody assessed it. Give it an impact type and its reason, or mark the file that stops the change \`unaffected\`.`,
      }))

const contextWork = (segment: Segment): Work[] => {
  const located = { target: "context", id: null, segmentId: segment.id } as const
  if (!segment.isContextRequired) return []
  return [
    ...(segment.context.trim() === ""
      ? [{ ...located, needs: "context", message: "The context is not written. Say why anyone should care about this change, what it changes from outside and what changed inside." } as const]
      : []),
    ...(segment.title.trim() === ""
      ? [{ ...located, needs: "segment-title", message: "The segment has no title. Say in a few words what its context is about." } as const]
      : []),
  ]
}

const waypointWork = (segment: Segment, sections: SectionSwitches): Work[] =>
  waypointsOf(segment).filter(({ waypoint }) => waypoint.isRequired).flatMap(({ waypoint }): Work[] => {
    const located = { target: "waypoint", id: waypoint.id, segmentId: segment.id } as const
    return [
      ...(waypoint.title === null
        ? [{ ...located, needs: "title", message: `\`${waypoint.id}\` has no title. A title says what was done and to what, not which code it is.` } as const]
        : []),
      ...(waypoint.reading.trim() === ""
        ? [{ ...located, needs: "reading", message: `\`${waypoint.id}\` has no reading. Say what the author changed here and what it is for.` } as const]
        : []),
      ...(sections.findings ? waypoint.findings : [])
        .filter((finding) => finding.kind !== QUESTION_KIND && finding.solution === null)
        .map((finding) => ({
          ...located,
          needs: "solution",
          message: `The ${finding.kind} \`${finding.id}\` on \`${waypoint.id}\` has no solution. Every bug, risk and nit carries the lines as they should be.`,
        } as const)),
    ]
  })

const traceNodesOf = (segment: Segment): TraceNode[] => listTraceNodes(segment.traceDiagram?.traceNodes ?? [])

export const hasDrawnTrace = (segment: Segment): boolean => traceNodesOf(segment).length > 0

const requiredTraceNodesOf = (segment: Segment): TraceNode[] => traceNodesOf(segment).filter((node) => node.isRequired)

const isTraceDescriptionRequired = (segment: Segment): boolean => hasDrawnTrace(segment) && segment.traceDiagram?.isRequired === true

const triggerLabelWork = (segment: Segment, node: TraceNode): Work[] =>
  node.triggerLabels
    .filter((trigger) => trigger.label === null)
    .map((trigger) => ({
      target: "trace-node",
      id: node.id,
      segmentId: segment.id,
      needs: "trigger-label",
      message: `The trigger \`${trigger.codeBlock.id}\` of \`${node.id}\` has no label. Say what the user does, or what is loaded.`,
    } as const))

const blockLabelWork = (segment: Segment, node: TraceNode): Work[] =>
  node.blockLabels
    .filter((listed) => listed.label === null)
    .map((listed) => ({
      target: "trace-node",
      id: node.id,
      segmentId: segment.id,
      needs: "block-label",
      message: `The block \`${listed.codeBlock.id}\` of \`${node.id}\` has no label. Say what the block does, starting with a verb.`,
    } as const))

const descriptionWork = (segment: Segment): Work[] =>
  isTraceDescriptionRequired(segment) && segment.traceDiagram?.description === null
    ? [{
        target: "trace-diagram",
        id: null,
        segmentId: segment.id,
        needs: "trace-description",
        message: "The Trace Diagram has no description. Tell the diagram in words, in five sentences at most: where its paths start, what they run through and where they reach the change.",
      }]
    : []

const nodeWork = (segment: Segment): Work[] =>
  requiredTraceNodesOf(segment).flatMap((node): Work[] => [
    ...(node.label === null
      ? [{
          target: "trace-node",
          id: node.id,
          segmentId: segment.id,
          needs: "label",
          message: `\`${node.id}\` still shows the declaration's name. A label says what the step does.`,
        } as const]
      : []),
    ...(node.rows === undefined ? [...triggerLabelWork(segment, node), ...blockLabelWork(segment, node)] : []),
  ])

const traceWork = (segment: Segment): Work[] => [...nodeWork(segment), ...descriptionWork(segment)]

const segmentWork = (segment: Segment, sections: SectionSwitches): Work[] => [
  ...(sections.blastDiagram ? blastWork(segment) : []),
  ...contextWork(segment),
  ...(sections.walkthrough ? waypointWork(segment, sections) : []),
  ...(sections.traceDiagram ? traceWork(segment) : []),
]

const contextCodeBlockWork = (artifact: ReviewArtifact): Work[] =>
  artifact.contextCodeBlocks.filter(isDescriptionOwed).map((listed) => ({
    target: "context-code-block",
    id: contextIdOf(listed),
    segmentId: null,
    needs: "context-description",
    message: `The context code block \`${contextIdOf(listed)}\` has no description. Say what it is and what it does, for a reader who has not seen it.`,
  }))

export const unwrittenWork = (artifact: ReviewArtifact, sections: SectionSwitches): Work[] => [
  ...artifact.segments.flatMap((segment) => segmentWork(segment, sections)),
  ...contextCodeBlockWork(artifact),
]

const nodeKeyOf = (target: WorkTarget, id: string | null, segmentId: string | null): string => [segmentId ?? "", target, id ?? ""].join("\n")

const requiredPathsOf = (blastDiagram: Blast): ReadonlySet<string> =>
  new Set(blastDiagram.nodes.filter((node) => node.isRequired).map((node) => node.path))

const assessedPathsOf = ({ blastDiagram }: Segment): string[] => {
  if (blastDiagram === null) return []
  const requiredPaths = requiredPathsOf(blastDiagram)
  const assessablePaths = [...listReachedPaths(blastDiagram), ...blastDiagram.nodes.filter((node) => node.impactType !== null).map((node) => node.path)]
  return [...new Set(assessablePaths.filter((path) => requiredPaths.has(path)))]
}

const nodeKeysIn = (segment: Segment, sections: SectionSwitches): string[] => [
  ...(sections.blastDiagram ? assessedPathsOf(segment).map((path) => nodeKeyOf("blast-node", path, segment.id)) : []),
  ...(segment.isContextRequired ? [nodeKeyOf("context", null, segment.id)] : []),
  ...(sections.walkthrough
    ? waypointsOf(segment).filter(({ waypoint }) => waypoint.isRequired).map(({ waypoint }) => nodeKeyOf("waypoint", waypoint.id, segment.id))
    : []),
  ...(sections.traceDiagram
    ? [
        ...requiredTraceNodesOf(segment).map((node) => nodeKeyOf("trace-node", node.id, segment.id)),
        ...(isTraceDescriptionRequired(segment) ? [nodeKeyOf("trace-diagram", null, segment.id)] : []),
      ]
    : []),
]

export const tallyNodes = (artifact: ReviewArtifact, sections: SectionSwitches): NodeTally => {
  const incompleteKeys = new Set(unwrittenWork(artifact, sections).map((one) => nodeKeyOf(one.target, one.id, one.segmentId)))
  const nodeKeys = [
    ...artifact.segments.flatMap((segment) => nodeKeysIn(segment, sections)),
    ...artifact.contextCodeBlocks.filter((listed) => listed.isRequired).map((listed) => nodeKeyOf("context-code-block", contextIdOf(listed), null)),
  ]
  const incomplete = nodeKeys.filter((key) => incompleteKeys.has(key)).length
  return { complete: nodeKeys.length - incomplete, incomplete }
}

export const tallyWork = (work: readonly Work[]): WorkTally => ({
  total: work.length,
  byKind: Object.fromEntries(
    WORK_KINDS
      .map((kind) => [kind, work.filter((one) => one.needs === kind).length] as const)
      .filter(([, count]) => count > 0),
  ),
})
