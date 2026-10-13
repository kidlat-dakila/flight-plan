import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import type { ReviewArtifact, SectionName, Segment, SourceFile } from "@flightplan/configurations"

export const DIAGRAM_SECTIONS = ["journey", "blast"] as const

export type DiagramSection = (typeof DIAGRAM_SECTIONS)[number]

export interface Generation {
  readonly section: SectionName
  readonly rebuilt: ReviewArtifact | null
  readonly writer: ReviewWriter | null
}

const KEY_SEPARATOR = "\n"
const DRAFTING_STATUS = "drafting"

export const isDiagramSection = (section: SectionName): section is DiagramSection =>
  DIAGRAM_SECTIONS.some((diagram) => diagram === section)

export const isLeftToAgent = (writer: ReviewWriter | null): boolean => writer !== null && writer.kind !== "author"

const segmentKeyOf = (segment: Segment): string => segment.changedPaths.join(KEY_SEPARATOR)

const withDiagram = (segment: Segment, section: DiagramSection, rebuiltSegments: readonly Segment[]): Segment => {
  const rebuilt = rebuiltSegments.find((candidate) => segmentKeyOf(candidate) === segmentKeyOf(segment))
  return rebuilt === undefined ? segment : { ...segment, [section]: rebuilt[section] }
}

const withSourcesOf = (sources: readonly SourceFile[], rebuilt: ReviewArtifact): SourceFile[] => [
  ...sources,
  ...rebuilt.sources.filter((source) => sources.every((held) => held.path !== source.path)),
]

const withScaffold = (artifact: ReviewArtifact, section: SectionName, rebuilt: ReviewArtifact | null): ReviewArtifact =>
  rebuilt === null || !isDiagramSection(section)
    ? artifact
    : {
        ...artifact,
        segments: artifact.segments.map((segment) => withDiagram(segment, section, rebuilt.segments)),
        sources: withSourcesOf(artifact.sources, rebuilt),
      }

export const planGeneration = (artifact: ReviewArtifact, { section, rebuilt, writer }: Generation): ReviewArtifact => ({
  ...withScaffold(artifact, section, rebuilt),
  sections: { ...sectionsOf(artifact), [section]: true },
  status: isLeftToAgent(writer) ? DRAFTING_STATUS : artifact.status,
})
