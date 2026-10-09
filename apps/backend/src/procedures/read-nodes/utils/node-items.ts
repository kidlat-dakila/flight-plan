import { waypointsOf, type LocatedWaypoint } from "@/procedures/read-artifact/utils/artifact-walk"
import { coverCode, type CoveredCode } from "@/procedures/read-artifact/utils/covered-code"
import type { Work, WorkKind, WorkTarget } from "@/procedures/read-artifact/utils/unwritten-work"
import { listCarriedImports } from "@flightplan/codegraph"
import type { BlastNode, ComponentReturn, DeclarationNode, JourneyNode, ReviewArtifact, Segment, SourceFile } from "@flightplan/configurations"

export interface NodeItem {
  readonly kind: WorkTarget | "unknown"
  readonly id: string | null
  readonly segmentId: string | null
  readonly needs: readonly WorkKind[]
  readonly file: string | null
  readonly node: unknown
  readonly lineage: readonly unknown[]
  readonly code: CoveredCode | null
}

interface Candidate {
  readonly kind: WorkTarget
  readonly id: string | null
  readonly segmentId: string
  readonly describe: (sources: readonly SourceFile[], maxLineCount: number) => Pick<NodeItem, "file" | "node" | "lineage" | "code">
}

const waypointCandidate = ({ segment, file, waypoint, ancestors }: LocatedWaypoint): Candidate => ({
  kind: "waypoint",
  id: waypoint.id,
  segmentId: segment.id,
  describe: (sources, maxLineCount) => ({
    file: file.path,
    node: {
      declaration: waypoint.declaration,
      title: waypoint.title,
      reading: waypoint.reading,
      needsAttention: waypoint.needsAttention,
      findings: waypoint.findings,
      childIds: waypoint.children.map((child) => child.id),
    },
    lineage: ancestors.map((ancestor) => ({ id: ancestor.id, declaration: ancestor.declaration, title: ancestor.title })),
    code: coverCode(sources, file.path, waypoint.declaration, maxLineCount),
  }),
})

const fileCandidates = (segment: Segment): Candidate[] =>
  segment.walkthrough.files.map((file) => ({
    kind: "file",
    id: file.path,
    segmentId: segment.id,
    describe: () => ({
      file: file.path,
      node: { title: file.title, summary: file.summary, waypointIds: file.waypoints.map((waypoint) => waypoint.id) },
      lineage: [],
      code: null,
    }),
  }))

const journeyCandidate = (segment: Segment, node: JourneyNode): Candidate => ({
  kind: "journey-node",
  id: node.id,
  segmentId: segment.id,
  describe: (sources, maxLineCount) => ({
    file: node.kind === "declaration" ? node.path : null,
    node,
    lineage: [],
    code: node.kind === "declaration" ? coverCode(sources, node.path, node.declaration, maxLineCount) : null,
  }),
})

const returnCandidate = (segment: Segment, component: DeclarationNode, componentReturn: ComponentReturn): Candidate => ({
  kind: "journey-node",
  id: componentReturn.id,
  segmentId: segment.id,
  describe: (sources, maxLineCount) => ({
    file: component.path,
    node: componentReturn,
    lineage: [{ id: component.id, declaration: component.declaration, label: component.label }],
    code: coverCode(sources, component.path, component.declaration, maxLineCount),
  }),
})

const journeyCandidates = (segment: Segment, node: JourneyNode): Candidate[] => [
  journeyCandidate(segment, node),
  ...(node.kind === "declaration" ? node.returns.map((componentReturn) => returnCandidate(segment, node, componentReturn)) : []),
]

const blastCandidate = (segment: Segment, node: BlastNode): Candidate => ({
  kind: "blast-node",
  id: node.path,
  segmentId: segment.id,
  describe: () => ({
    file: node.path,
    node: { ...node, importsCarryingTheChange: segment.blast === null ? [] : listCarriedImports(segment.blast, node.path) },
    lineage: [],
    code: null,
  }),
})

const contextCandidate = (segment: Segment): Candidate => ({
  kind: "context",
  id: null,
  segmentId: segment.id,
  describe: () => ({ file: null, node: { title: segment.title, context: segment.context }, lineage: [], code: null }),
})

const candidatesIn = (segment: Segment): Candidate[] => [
  ...(segment.blast?.nodes ?? []).filter((node) => node.diffType === null).map((node) => blastCandidate(segment, node)),
  contextCandidate(segment),
  ...fileCandidates(segment),
  ...waypointsOf(segment).map(waypointCandidate),
  ...(segment.journey?.nodes ?? []).flatMap((node) => journeyCandidates(segment, node)),
]

const needsOf = (candidate: Candidate, work: readonly Work[]): WorkKind[] =>
  work
    .filter((one) => one.target === candidate.kind && one.id === candidate.id && one.segmentId === candidate.segmentId)
    .map((one) => one.needs)

const toItem = (candidate: Candidate, needs: readonly WorkKind[], artifact: ReviewArtifact, maxLineCount: number): NodeItem => ({
  kind: candidate.kind,
  id: candidate.id,
  segmentId: candidate.segmentId,
  needs,
  ...candidate.describe(artifact.sources, maxLineCount),
})

const unknownItem = (id: string): NodeItem => ({
  kind: "unknown",
  id,
  segmentId: null,
  needs: [],
  file: null,
  node: null,
  lineage: [],
  code: null,
})

export interface NodeSelection {
  readonly artifact: ReviewArtifact
  readonly segments: readonly Segment[]
  readonly work: readonly Work[]
  readonly maxLineCount: number
}

export const itemsWithIds = ({ artifact, segments, work, maxLineCount }: NodeSelection, ids: readonly string[]): NodeItem[] => {
  const candidates = segments.flatMap(candidatesIn)
  return ids.flatMap((id) => {
    const matches = candidates.filter((candidate) => candidate.id === id)
    return matches.length === 0
      ? [unknownItem(id)]
      : matches.map((candidate) => toItem(candidate, needsOf(candidate, work), artifact, maxLineCount))
  })
}

export const unwrittenItems = (
  { artifact, segments, work, maxLineCount }: NodeSelection,
  wantedKinds: readonly WorkKind[],
): NodeItem[] =>
  segments
    .flatMap(candidatesIn)
    .map((candidate) => ({ candidate, needs: needsOf(candidate, work).filter((kind) => wantedKinds.includes(kind)) }))
    .filter(({ needs }) => needs.length > 0)
    .map(({ candidate, needs }) => toItem(candidate, needs, artifact, maxLineCount))
