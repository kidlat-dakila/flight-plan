import { WRITE_UP_SECTIONS, type WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { withRequiredSections } from "@/procedures/read-artifact/utils/required-nodes"
import { unwrittenWork, type Work, type WorkTarget } from "@/procedures/read-artifact/utils/unwritten-work"
import type { ReviewArtifact } from "@flightplan/configurations"

export type WriteUpCounts = Readonly<Record<WriteUpSection, number>>

type NodeSection = Exclude<WriteUpSection, "findings">

const SECTION_OF_TARGET: Readonly<Record<WorkTarget, NodeSection | null>> = {
  "context": "context",
  "waypoint": "walkthrough",
  "trace-node": "traceDiagram",
  "trace-diagram": "traceDiagram",
  "blast-node": "blastDiagram",
  "context-code-block": null,
}

const NODE_KEY_SEPARATOR = "\n"

const nodeKeyOf = ({ target, id, segmentId }: Work): string => [segmentId ?? "", target, id ?? ""].join(NODE_KEY_SEPARATOR)

const unwrittenNodeCountOf = (artifact: ReviewArtifact, section: NodeSection): number =>
  new Set(
    unwrittenWork(withRequiredSections(artifact, [section]))
      .filter((work) => SECTION_OF_TARGET[work.target] === section)
      .map(nodeKeyOf),
  ).size

const waypointCountOf = (artifact: ReviewArtifact): number =>
  artifact.segments.flatMap(waypointsOf).length

export const writeUpCountsOf = (artifact: ReviewArtifact): WriteUpCounts => ({
  context: unwrittenNodeCountOf(artifact, "context"),
  traceDiagram: unwrittenNodeCountOf(artifact, "traceDiagram"),
  blastDiagram: unwrittenNodeCountOf(artifact, "blastDiagram"),
  walkthrough: unwrittenNodeCountOf(artifact, "walkthrough"),
  findings: waypointCountOf(artifact),
})

export const totalCountOf = (counts: WriteUpCounts, sections: readonly WriteUpSection[]): number =>
  WRITE_UP_SECTIONS.filter((section) => sections.includes(section)).reduce((total, section) => total + counts[section], 0)
