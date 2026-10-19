import { classificationOfBlock, classificationViewOf } from "@/code-blocks/classification-view"
import { nameOfBlock } from "@/trace/names"
import {
  CODE_BLOCK_CLASSIFICATIONS,
  type ChangeOverview,
  type ChangeOverviewCard,
  type ChangeOverviewRow,
  type CodeBlock,
  type CodeBlockClassification,
} from "@flightplan/configurations"
import { waypointAnchorId, type FileEntry, type PreparedWalkthrough } from "./build"
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

const cardsOfFile = (entry: FileEntry): ClassifiedCard[] =>
  entry.rootBlocks.flatMap(({ id, block }): ClassifiedCard[] => {
    const labels = labelsOfRootBlock(block, entry.highlighted?.source ?? null)
    const waypointId = firstWaypointOn(entry, block)
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
            waypointAnchorId: waypointId === null ? null : waypointAnchorId(waypointId),
          },
        }]
  })

const toRow = (classification: CodeBlockClassification, cards: readonly ClassifiedCard[]): ChangeOverviewRow[] => {
  const inRow = cards.filter((classified) => classified.classification === classification)
  return inRow.length === 0 ? [] : [{ classification: classificationViewOf(inRow[0].block), cards: inRow.map(({ card }) => card) }]
}

export const buildChangeOverview = (prepared: PreparedWalkthrough): ChangeOverview => {
  const cards = prepared.files.flatMap(({ entry }) => cardsOfFile(entry))
  return {
    heading: CHANGE_OVERVIEW_HEADING,
    emptyMessage: cards.length === 0 ? NO_CHANGES_MESSAGE : null,
    rows: CODE_BLOCK_CLASSIFICATIONS.flatMap((classification) => toRow(classification, cards)),
  }
}
