import { codeLinkIdOf } from "@/code/links"
import type { DiagramSettings } from "@/journey/filter"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import {
  BLAST_VERDICTS,
  type Blast,
  type BlastBand,
  type BlastEdgeView,
  type BlastNode,
  type BlastNodeView,
  type BlastVerdict,
  type Segment,
} from "@flightplan/configurations"
import { deriveShields, filterBlast, isEpicenter } from "./filter"
import { layoutBlast, type PlacedBlastEdge, type PlacedBlastNode, type PlacedZone } from "./layout"

const BLAST_ANCHOR_NAME = "blast-diagram"

const DIRECT_RING = 1

const VERDICT_LABELS: Readonly<Record<BlastVerdict, string>> = {
  "changed": "Changed",
  "breaks": "Breaks",
  "behaviour-changes": "Behaviour changes",
  "unaffected": "Unaffected",
  "unassessed": "Not assessed",
}

const VERDICT_SUMMARY_NOUNS: Readonly<Record<BlastVerdict, readonly [string, string]>> = {
  "changed": ["changed", "changed"],
  "breaks": ["breaks", "break"],
  "behaviour-changes": ["changes behaviour", "change behaviour"],
  "unaffected": ["unaffected", "unaffected"],
  "unassessed": ["not assessed", "not assessed"],
}

const verdictOf = (node: BlastNode): BlastVerdict => {
  if (isEpicenter(node)) return "changed"
  return node.verdict ?? "unassessed"
}

const zoneLabelOf = (ring: number): string => {
  if (ring < DIRECT_RING) return "Epicenter"
  if (ring === DIRECT_RING) return "Direct impact"
  return `Indirect impact, ring ${String(ring)}`
}

const toNodeView = (
  { node, ...box }: PlacedBlastNode,
  shields: ReadonlyMap<string, BlastNode>,
  context: ReviewViewContext,
): BlastNodeView => {
  const shield = shields.get(node.id)
  const linkId = codeLinkIdOf(node.path, node.declaration)
  return {
    ...box,
    id: node.id,
    verdict: verdictOf(node),
    verdictLabel: VERDICT_LABELS[verdictOf(node)],
    label: node.label ?? node.declaration,
    isDraft: node.label === null,
    shieldLabel: shield === undefined ? null : `Shielded by ${shield.label ?? shield.declaration}`,
    contract: node.contract === null
      ? null
      : {
          beforeLabel: "Before",
          before: node.contract.before === null ? null : parseProse(node.contract.before, context.knownLinkIds),
          absentLabel: "Did not exist before this change.",
          nowLabel: "Now",
          now: parseProse(node.contract.now, context.knownLinkIds),
        },
    effect: node.effect === null ? null : parseProse(node.effect, context.knownLinkIds),
    codeLinkId: context.knownLinkIds.has(linkId) ? linkId : null,
  }
}

const toEdgeView = ({ edge, route, points }: PlacedBlastEdge): BlastEdgeView => ({
  id: `${edge.from}>${edge.to}:${edge.kind}`,
  kind: edge.kind,
  isAssumed: edge.certainty === "assumed",
  route,
  points: [...points],
})

const toZoneView = (zone: PlacedZone): { label: string, x: number, width: number } => ({
  label: zoneLabelOf(zone.ring),
  x: zone.x,
  width: zone.width,
})

const summaryOf = (nodes: readonly BlastNode[]): BlastBand["summary"] =>
  BLAST_VERDICTS
    .map((verdict) => ({ verdict, count: nodes.filter((node) => verdictOf(node) === verdict).length }))
    .filter(({ count }) => count > 0)
    .map(({ verdict, count }) => ({ verdict, label: countLabel(count, ...VERDICT_SUMMARY_NOUNS[verdict]) }))

const nodeSummaryLabel = (shownCount: number, totalCount: number): string =>
  shownCount === totalCount
    ? countLabel(totalCount, "node", "nodes")
    : `${String(shownCount)} of ${countLabel(totalCount, "node", "nodes")}`

const buildBoard = (shown: Blast, whole: Blast, context: ReviewViewContext): NonNullable<BlastBand["board"]> => {
  const layout = layoutBlast(shown)
  const shields = deriveShields(whole)
  return {
    width: layout.width,
    height: layout.height,
    zones: layout.zones.map(toZoneView),
    files: layout.files.map(({ path, ...file }) => ({ ...file, label: path })),
    nodes: layout.nodes.map((placed) => toNodeView(placed, shields, context)),
    edges: layout.edges.map(toEdgeView),
  }
}

export const buildBlast = (
  segment: Segment,
  scope: string,
  settings: DiagramSettings,
  context: ReviewViewContext,
): BlastBand | null => {
  const { blast } = segment
  if (blast === null && segment.blastAbsence === null) return null
  const filtered = blast === null ? null : filterBlast(blast, settings)
  return {
    anchorId: `${scope}${BLAST_ANCHOR_NAME}`,
    heading: "Blast Diagram",
    absence: segment.blastAbsence === null ? null : parseProse(segment.blastAbsence, context.knownLinkIds),
    summary: filtered === null ? [] : summaryOf(filtered.nodes),
    summaryLabel: filtered === null || blast === null ? "" : nodeSummaryLabel(filtered.nodes.length, blast.nodes.length),
    board: filtered === null || blast === null ? null : buildBoard(filtered, blast, context),
  }
}
