import type {
  BlastNode,
  JourneyNode,
  PresetName,
  ReviewArtifact,
  SectionSwitches,
  Segment,
  Waypoint,
} from "@flightplan/configurations"
import { waypointsOf } from "./artifact-walk"
import { changedHunksOf } from "./covered-code"
import { tallyWork, unwrittenWork } from "./unwritten-work"

export const ARTIFACT_SECTIONS = ["overview", "full", "context", "journey", "blast", "code-walkthrough", "diff"] as const

export type ArtifactSection = (typeof ARTIFACT_SECTIONS)[number]

export interface DiffPage {
  readonly paths: readonly string[] | null
  readonly limit: number
  readonly after: string | null
}

export type DiffProjection
  = | { readonly kind: "projected", readonly content: unknown }
    | { readonly kind: "refused", readonly message: string }

const DIFF_CONTEXT_ROW_COUNT = 3

const waypointStubOf = (waypoint: Waypoint): unknown => ({
  id: waypoint.id,
  declaration: waypoint.declaration,
  title: waypoint.title,
  isReadingWritten: waypoint.reading.trim() !== "",
  findingCount: waypoint.findings.length,
  children: waypoint.children.map(waypointStubOf),
})

const journeyStubOf = (node: JourneyNode): unknown =>
  node.kind === "entry-point"
    ? { id: node.id, kind: node.kind, label: node.label }
    : { id: node.id, kind: node.kind, path: node.path, declaration: node.declaration, changeType: node.changeType, isAdded: node.isAdded, label: node.label }

const blastStubOf = (node: BlastNode): unknown => ({
  id: node.id,
  ring: node.ring,
  path: node.path,
  declaration: node.declaration,
  label: node.label,
  hasContract: node.contract !== null,
  verdict: node.verdict,
})

const segmentOverviewOf = (segment: Segment): unknown => ({
  segmentId: segment.id,
  title: segment.title,
  changedPaths: segment.changedPaths,
  journey: segment.journey === null
    ? { absence: segment.journeyAbsence }
    : { nodes: segment.journey.nodes.map(journeyStubOf) },
  blast: segment.blast === null
    ? { absence: segment.blastAbsence }
    : { nodes: segment.blast.nodes.map(blastStubOf) },
  files: segment.walkthrough.files.map((file) => ({
    path: file.path,
    title: file.title,
    waypoints: file.waypoints.map(waypointStubOf),
  })),
})

export const projectOverview = (artifact: ReviewArtifact, preset: PresetName, sections: SectionSwitches): unknown => ({
  title: artifact.title,
  status: artifact.status,
  commit: artifact.commit,
  configuration: preset,
  sections,
  segments: artifact.segments.map(segmentOverviewOf),
  sources: artifact.sources.map((source) => ({ path: source.path, declarations: Object.keys(source.declarations) })),
  unwritten: tallyWork(unwrittenWork(artifact, sections)),
})

const SEGMENT_PARTS: Readonly<Record<Exclude<ArtifactSection, "overview" | "full" | "diff">, (segment: Segment) => unknown>> = {
  "context": (segment) => ({ segmentId: segment.id, context: segment.context }),
  "journey": (segment) => ({ segmentId: segment.id, journey: segment.journey, journeyAbsence: segment.journeyAbsence }),
  "blast": (segment) => ({ segmentId: segment.id, blast: segment.blast, blastAbsence: segment.blastAbsence }),
  "code-walkthrough": (segment) => ({ segmentId: segment.id, walkthrough: segment.walkthrough }),
}

export const projectSegments = (
  section: Exclude<ArtifactSection, "overview" | "diff">,
  artifact: ReviewArtifact,
  segments: readonly Segment[],
): unknown =>
  section === "full"
    ? { title: artifact.title, status: artifact.status, commit: artifact.commit, segments }
    : { segments: segments.map(SEGMENT_PARTS[section]) }

const waypointIdsFor = (segments: readonly Segment[], path: string): string[] =>
  segments.flatMap((segment) =>
    waypointsOf(segment).filter((located) => located.file.path === path).map((located) => located.waypoint.id))

const segmentIdFor = (segments: readonly Segment[], path: string): string | null =>
  segments.find((segment) => segment.changedPaths.includes(path))?.id ?? null

const unmentionedPathsOf = (artifact: ReviewArtifact): string[] => {
  const touredPaths = new Set(artifact.segments.flatMap((segment) => segment.walkthrough.files.map((file) => file.path)))
  return artifact.changedPaths.filter((path) => !touredPaths.has(path))
}

export const projectDiff = (artifact: ReviewArtifact, segments: readonly Segment[], page: DiffPage): DiffProjection => {
  const segmentPaths = new Set(segments.flatMap((segment) => segment.changedPaths))
  const sources = artifact.sources
    .filter((source) => segmentPaths.has(source.path))
    .filter((source) => page.paths === null || page.paths.includes(source.path))
  const afterIndex = page.after === null ? -1 : sources.findIndex((source) => source.path === page.after)
  if (page.after !== null && afterIndex < 0) {
    return { kind: "refused", message: `No changed file at ${page.after} to continue after. Pass the \`next\` of the previous page unchanged.` }
  }
  const shown = sources.slice(afterIndex + 1, afterIndex + 1 + page.limit)
  const lastShown = shown.at(-1)
  return {
    kind: "projected",
    content: {
      total: sources.length,
      files: shown.map((source) => ({
        path: source.path,
        segmentId: segmentIdFor(segments, source.path),
        language: source.language,
        waypointIds: waypointIdsFor(segments, source.path),
        hunks: changedHunksOf(source, DIFF_CONTEXT_ROW_COUNT),
      })),
      next: lastShown !== undefined && afterIndex + 1 + page.limit < sources.length ? lastShown.path : null,
      unmentioned: unmentionedPathsOf(artifact),
    },
  }
}
