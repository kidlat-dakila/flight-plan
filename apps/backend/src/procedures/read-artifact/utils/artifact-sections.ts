import {
  ALL_SECTIONS_ON,
  SECTION_FIELD_PATHS,
  SECTION_LABELS,
  SECTION_NAMES,
  type ReviewArtifact,
  type SectionName,
  type SectionSwitches,
} from "@flightplan/configurations"

const PATH_SEPARATOR = "."

export const sectionsOf = (artifact: ReviewArtifact): SectionSwitches => artifact.sections ?? ALL_SECTIONS_ON

export const switchedOffSections = (sections: SectionSwitches): SectionName[] =>
  SECTION_NAMES.filter((section) => !sections[section])

export const notGeneratedMessage = (section: SectionName): string =>
  `The reviewer chose not to generate the ${SECTION_LABELS[section]} for this review. Do not write this, and do not ask the reviewer about it.`

const isFieldOf = (path: string, section: SectionName): boolean =>
  path === SECTION_FIELD_PATHS[section] || path.startsWith(`${SECTION_FIELD_PATHS[section]}${PATH_SEPARATOR}`)

export const offSectionOfField = (path: string, sections: SectionSwitches): SectionName | null =>
  switchedOffSections(sections).find((section) => isFieldOf(path, section)) ?? null

export const withSections = (artifact: ReviewArtifact, sections: SectionSwitches): ReviewArtifact => ({
  ...artifact,
  sections,
  segments: artifact.segments.map((segment) => ({
    ...segment,
    traceDiagram: sections.traceDiagram ? segment.traceDiagram : null,
    blastDiagram: sections.blastDiagram ? segment.blastDiagram : null,
  })),
})
