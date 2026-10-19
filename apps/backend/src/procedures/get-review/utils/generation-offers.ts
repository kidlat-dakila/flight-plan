import { BLAST_ANCHOR_NAME } from "@flightplan/codegraph"
import { SECTION_LABELS, type SectionSwitches } from "@flightplan/configurations"
import type { GenerationOffer, GenerationOffers, OfferedSection } from "./schemas"

export interface OfferPlace {
  readonly scope: string
  readonly traceAnchorId: string
  readonly walkthroughAnchorId: string
  readonly isSegmented: boolean
}

const GENERATE_LABEL = "Generate"
const GENERATING_LABEL = "Generating"
const FINDINGS_ANCHOR_SUFFIX = "-findings"
const EVERY_SEGMENT_NOTE = "This covers every segment of this Flight Plan."

const HEADINGS: Readonly<Record<OfferedSection, string>> = {
  traceDiagram: SECTION_LABELS.traceDiagram,
  blastDiagram: SECTION_LABELS.blastDiagram,
  findings: "Findings",
}

const MESSAGES: Readonly<Record<OfferedSection, string>> = {
  traceDiagram: "The Trace Diagram was not generated: the configuration of this Flight Plan leaves it out. Generate it to draw the path to the change and have it written.",
  blastDiagram: "The Blast Diagram was not generated: the configuration of this Flight Plan leaves it out. Generate it to draw the files the change reaches and have each one assessed.",
  findings: "Findings were not generated: the configuration of this Flight Plan leaves them out. Generate them to have the code of every waypoint checked for what is wrong with it.",
}

const anchorIdOf = (section: OfferedSection, place: OfferPlace): string => {
  if (section === "traceDiagram") return place.traceAnchorId
  return section === "blastDiagram" ? `${place.scope}${BLAST_ANCHOR_NAME}` : `${place.walkthroughAnchorId}${FINDINGS_ANCHOR_SUFFIX}`
}

const offerOf = (section: OfferedSection, sections: SectionSwitches, place: OfferPlace): GenerationOffer | null =>
  sections[section]
    ? null
    : {
        section,
        anchorId: anchorIdOf(section, place),
        heading: HEADINGS[section],
        message: place.isSegmented ? `${MESSAGES[section]} ${EVERY_SEGMENT_NOTE}` : MESSAGES[section],
        generateLabel: GENERATE_LABEL,
        generatingLabel: GENERATING_LABEL,
      }

export const buildGenerationOffers = (sections: SectionSwitches, place: OfferPlace): GenerationOffers => ({
  traceDiagram: offerOf("traceDiagram", sections, place),
  blastDiagram: offerOf("blastDiagram", sections, place),
  findings: offerOf("findings", sections, place),
})
