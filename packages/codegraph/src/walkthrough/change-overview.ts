import { buildCodeLink } from "@/code/links"
import { classificationOfBlock, classificationViewOf } from "@/code-blocks/classification-view"
import type { BlobLinker } from "@/review-view-context"
import { nameOfBlock } from "@/trace/names"
import {
  CODE_BLOCK_CLASSIFICATIONS,
  type ChangeOverview,
  type ChangeOverviewCard,
  type ChangeOverviewRow,
  type CodeBlock,
  type CodeBlockClassification,
  type CodeLink,
} from "@flightplan/configurations"
import { waypointAnchorId, type FileEntry, type PreparedWalkthrough } from "./build"
import type { FileRootBlock } from "./reviewable-file"
import { labelsOfRootBlock } from "./root-blocks"

const CHANGE_OVERVIEW_HEADING = "Change Overview"
const NO_CHANGES_MESSAGE = "No code changed."

interface ClassifiedCard {
  readonly classification: CodeBlockClassification
  readonly block: CodeBlock
  readonly card: ChangeOverviewCard
}

const firstWaypointOn = (entry: FileEntry, root: CodeBlock): string | null =>
  entry.waypoints.find((flat) => flat.rootBlocks.includes(root))?.waypoint.id ?? null

const previewOf = (entry: FileEntry, { block, span }: FileRootBlock, anchorId: string | null, blobLinkOf: BlobLinker): CodeLink | null => {
  const [{ start, end }] = block.lineOfCodeRangeReference
  return entry.highlighted === null || span === null
    ? null
    : buildCodeLink({ highlighted: entry.highlighted, range: { lineStart: start.line, lineEnd: end.line }, span }, anchorId, blobLinkOf)
}

const cardsOfFile = (entry: FileEntry, blobLinkOf: BlobLinker): ClassifiedCard[] =>
  entry.rootBlocks.flatMap((rootBlock): ClassifiedCard[] => {
    const { id, block } = rootBlock
    const labels = labelsOfRootBlock(block, entry.highlighted?.source ?? null)
    const waypointId = firstWaypointOn(entry, block)
    const anchorId = waypointId === null ? null : waypointAnchorId(waypointId)
    return labels === null
      ? []
      : [{
          classification: classificationOfBlock(block),
          block,
          card: {
            id,
            label: block.name ?? nameOfBlock(block),
            typeLabel: labels.typeLabel,
            path: entry.file.path,
            change: labels.change,
            changeLabel: labels.changeLabel,
            waypointAnchorId: anchorId,
            preview: previewOf(entry, rootBlock, anchorId, blobLinkOf),
          },
        }]
  })

const toRow = (classification: CodeBlockClassification, cards: readonly ClassifiedCard[]): ChangeOverviewRow[] => {
  const inRow = cards.filter((classified) => classified.classification === classification)
  return inRow.length === 0 ? [] : [{ classification: classificationViewOf(inRow[0].block), cards: inRow.map(({ card }) => card) }]
}

export const buildChangeOverview = (prepared: PreparedWalkthrough, blobLinkOf: BlobLinker): ChangeOverview => {
  const cards = prepared.files.flatMap(({ entry }) => cardsOfFile(entry, blobLinkOf))
  return {
    heading: CHANGE_OVERVIEW_HEADING,
    emptyMessage: cards.length === 0 ? NO_CHANGES_MESSAGE : null,
    rows: CODE_BLOCK_CLASSIFICATIONS.flatMap((classification) => toRow(classification, cards)),
  }
}
