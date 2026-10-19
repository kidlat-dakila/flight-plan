import { contextIdOf, flattenTraceNodes, storeFileSection } from "@flightplan/codegraph"
import type {
  ReviewArtifact,
  SectionName,
  SectionSwitches,
  Segment,
  Waypoint,
} from "@flightplan/configurations"
import { waypointsOf } from "./artifact-walk"
import { contextStubOf } from "./context-code-blocks"
import { changedHunksOf } from "./covered-code"
import { tallyWork, unwrittenWork } from "./unwritten-work"

export const ARTIFACT_SECTIONS = ["overview", "full", "context", "trace-diagram", "blast-diagram", "code-walkthrough", "diff"] as const

export type ArtifactSection = (typeof ARTIFACT_SECTIONS)[number]

const SECTION_NAME_BY_ARTIFACT_SECTION: Readonly<Partial<Record<ArtifactSection, SectionName>>> = {
  "trace-diagram": "traceDiagram",
  "blast-diagram": "blastDiagram",
  "code-walkthrough": "walkthrough",
}

export const sectionNameOf = (section: ArtifactSection): SectionName | null => SECTION_NAME_BY_ARTIFACT_SECTION[section] ?? null

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
  isRequired: waypoint.isRequired,
  children: waypoint.children.map(waypointStubOf),
})

const traceStubsOf = (segment: Segment): unknown[] =>
  flattenTraceNodes(segment.traceDiagram?.traceNodes ?? []).map(({ id, parentId, type, label, diffCodeBlockIds, isRequired }) => ({
    id,
    parentId,
    type,
    label,
    isChanged: diffCodeBlockIds.length > 0,
    isRequired,
  }))

const flatTraceOf = (segment: Segment): unknown =>
  segment.traceDiagram === null
    ? null
    : {
        description: segment.traceDiagram.description,
        isDescriptionRequired: segment.traceDiagram.isRequired,
        nodes: flattenTraceNodes(segment.traceDiagram.traceNodes),
        edges: segment.traceDiagram.traceNodeEdges,
      }

const storedWalkthroughOf = ({ walkthrough }: Segment): unknown => ({ ...walkthrough, files: walkthrough.files.map(storeFileSection) })

const segmentOverviewOf = (segment: Segment): unknown => ({
  segmentId: segment.id,
  title: segment.title,
  isContextRequired: segment.isContextRequired,
  changedPaths: segment.changedPaths,
  traceDiagram: segment.traceDiagram === null
    ? null
    : {
        isDescriptionWritten: segment.traceDiagram.description !== null,
        isDescriptionRequired: segment.traceDiagram.isRequired,
        nodes: traceStubsOf(segment),
      },
  blastDiagram: segment.blastDiagram,
  files: segment.walkthrough.files.map((file) => ({ path: file.path, waypoints: file.waypoints.map(waypointStubOf) })),
})

export const projectOverview = (artifact: ReviewArtifact, configurationId: string, sections: SectionSwitches): unknown => ({
  title: artifact.title,
  status: artifact.status,
  commit: artifact.commit,
  configuration: configurationId,
  sections,
  segments: artifact.segments.map(segmentOverviewOf),
  sources: artifact.sources.map((source) => ({ path: source.path, declarations: Object.keys(source.declarations) })),
  contextCodeBlocks: artifact.contextCodeBlocks.filter((listed) => listed.isRequired).map(contextStubOf),
  unwritten: tallyWork(unwrittenWork(artifact, sections)),
})

const SEGMENT_PARTS: Readonly<Record<Exclude<ArtifactSection, "overview" | "full" | "diff">, (segment: Segment) => unknown>> = {
  "context": (segment) => ({ segmentId: segment.id, context: segment.context, isContextRequired: segment.isContextRequired }),
  "trace-diagram": (segment) => ({ segmentId: segment.id, traceDiagram: flatTraceOf(segment) }),
  "blast-diagram": (segment) => ({ segmentId: segment.id, blastDiagram: segment.blastDiagram }),
  "code-walkthrough": (segment) => ({ segmentId: segment.id, walkthrough: storedWalkthroughOf(segment) }),
}

export const projectSegments = (
  section: Exclude<ArtifactSection, "overview" | "diff">,
  artifact: ReviewArtifact,
  segments: readonly Segment[],
): unknown =>
  section === "full"
    ? {
        title: artifact.title,
        status: artifact.status,
        commit: artifact.commit,
        segments: segments.map((segment) => ({ ...segment, traceDiagram: flatTraceOf(segment), walkthrough: storedWalkthroughOf(segment) })),
        contextCodeBlocks: artifact.contextCodeBlocks
          .filter((listed) => listed.description !== null)
          .map((listed) => ({ id: contextIdOf(listed), description: listed.description })),
      }
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
