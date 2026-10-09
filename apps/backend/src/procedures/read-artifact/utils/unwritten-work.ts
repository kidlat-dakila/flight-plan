import { listReachedPaths, listUnassessedNodes } from "@flightplan/codegraph"
import type { JourneyNode, ReviewArtifact, Segment, SectionSwitches } from "@flightplan/configurations"
import { waypointsOf } from "./artifact-walk"

export const WORK_KINDS = [
  "impact",
  "context",
  "segment-title",
  "file-title",
  "title",
  "reading",
  "label",
  "solution",
] as const

export type WorkKind = (typeof WORK_KINDS)[number]

export type WorkTarget = "blast-node" | "context" | "file" | "waypoint" | "journey-node"

export interface Work {
  readonly target: WorkTarget
  readonly id: string | null
  readonly segmentId: string
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
  segment.blast === null
    ? []
    : listUnassessedNodes(segment.blast).map((node) => ({
        target: "blast-node",
        id: node.path,
        segmentId: segment.id,
        needs: "impact",
        message: `\`${node.path}\` imports the changed code and nobody assessed it. Give it an impact type and its reason, or mark the file that stops the change \`unaffected\`.`,
      }))

const contextWork = (segment: Segment): Work[] => {
  const located = { target: "context", id: null, segmentId: segment.id } as const
  return [
    ...(segment.context.trim() === ""
      ? [{ ...located, needs: "context", message: "The context is not written. Say why anyone should care about this change, what it changes from outside and what changed inside." } as const]
      : []),
    ...(segment.title.trim() === ""
      ? [{ ...located, needs: "segment-title", message: "The segment has no title. Say in a few words what its context is about." } as const]
      : []),
  ]
}

const fileWork = (segment: Segment): Work[] =>
  segment.walkthrough.files
    .filter((file) => file.title === file.path)
    .map((file) => ({
      target: "file",
      id: file.path,
      segmentId: segment.id,
      needs: "file-title",
      message: `The File Section of \`${file.path}\` is still titled with its path. Say what the reviewer is shown in this file.`,
    }))

const waypointWork = (segment: Segment): Work[] =>
  waypointsOf(segment).flatMap(({ waypoint }): Work[] => {
    const located = { target: "waypoint", id: waypoint.id, segmentId: segment.id } as const
    return [
      ...(waypoint.title === null
        ? [{ ...located, needs: "title", message: `\`${waypoint.id}\` has no title. A title says what was done and to what, not which code it is.` } as const]
        : []),
      ...(waypoint.reading.trim() === ""
        ? [{ ...located, needs: "reading", message: `\`${waypoint.id}\` has no reading. Say what the author changed here and what it is for.` } as const]
        : []),
      ...waypoint.findings
        .filter((finding) => finding.kind !== QUESTION_KIND && finding.solution === null)
        .map((finding) => ({
          ...located,
          needs: "solution",
          message: `The ${finding.kind} \`${finding.id}\` on \`${waypoint.id}\` has no solution. Every bug, risk and nit carries the lines as they should be.`,
        } as const)),
    ]
  })

const unlabelledReturnWork = (segment: Segment, node: JourneyNode): Work[] =>
  node.kind === "entry-point"
    ? []
    : node.returns
        .filter((componentReturn) => componentReturn.label === null)
        .map((componentReturn) => ({
          target: "journey-node",
          id: componentReturn.id,
          segmentId: segment.id,
          needs: "label",
          message: `\`${componentReturn.id}\` still shows its statement. A label says what the component shows when it returns there.`,
        } as const))

const journeyWork = (segment: Segment): Work[] =>
  (segment.journey?.nodes ?? []).flatMap((node): Work[] => [
    ...(node.kind === "declaration" && node.label === null
      ? [{
          target: "journey-node",
          id: node.id,
          segmentId: segment.id,
          needs: "label",
          message: `\`${node.id}\` still shows the declaration's name. A label says what the step does.`,
        } as const]
      : []),
    ...unlabelledReturnWork(segment, node),
  ])

const segmentWork = (segment: Segment, sections: SectionSwitches): Work[] => [
  ...(sections.blast ? blastWork(segment) : []),
  ...contextWork(segment),
  ...(sections.walkthrough ? [...fileWork(segment), ...waypointWork(segment)] : []),
  ...(sections.journey ? journeyWork(segment) : []),
]

export const unwrittenWork = (artifact: ReviewArtifact, sections: SectionSwitches): Work[] =>
  artifact.segments.flatMap((segment) => segmentWork(segment, sections))

const nodeKeyOf = (target: WorkTarget, id: string | null, segmentId: string): string => [segmentId, target, id ?? ""].join("\n")

const journeyIdsOf = (node: JourneyNode): string[] => [
  node.id,
  ...(node.kind === "declaration" ? node.returns.map((componentReturn) => componentReturn.id) : []),
]

const assessedPathsOf = ({ blast }: Segment): string[] =>
  blast === null ? [] : [...new Set([...listReachedPaths(blast), ...blast.nodes.filter((node) => node.impactType !== null).map((node) => node.path)])]

const nodeKeysIn = (segment: Segment, sections: SectionSwitches): string[] => [
  ...(sections.blast ? assessedPathsOf(segment).map((path) => nodeKeyOf("blast-node", path, segment.id)) : []),
  nodeKeyOf("context", null, segment.id),
  ...(sections.walkthrough
    ? [
        ...segment.walkthrough.files.map((file) => nodeKeyOf("file", file.path, segment.id)),
        ...waypointsOf(segment).map(({ waypoint }) => nodeKeyOf("waypoint", waypoint.id, segment.id)),
      ]
    : []),
  ...(sections.journey ? (segment.journey?.nodes ?? []).flatMap(journeyIdsOf).map((id) => nodeKeyOf("journey-node", id, segment.id)) : []),
]

export const tallyNodes = (artifact: ReviewArtifact, sections: SectionSwitches): NodeTally => {
  const incompleteKeys = new Set(unwrittenWork(artifact, sections).map((one) => nodeKeyOf(one.target, one.id, one.segmentId)))
  const nodeKeys = artifact.segments.flatMap((segment) => nodeKeysIn(segment, sections))
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
