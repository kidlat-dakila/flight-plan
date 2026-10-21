import { isInSpan, rowSpanOf, type RowSpan } from "@/code/lines"
import { classificationOfBlock } from "@/code-blocks/classification-view"
import { BLOCK_TYPE_LABELS } from "@/trace/names"
import {
  CODE_BLOCK_CLASSIFICATION_LABELS,
  CODE_BLOCK_CLASSIFICATIONS,
  ROOT_BLOCK_CHANGES,
  type CodeBlock,
  type CodeBlockClassification,
  type CodeBlockType,
  type RootBlockChange,
  type SourceFile,
  type Waypoint,
} from "@flightplan/configurations"

export type RootBlockKey = `block:${CodeBlockClassification}:${RootBlockChange}`

interface RootBlockMark {
  readonly type: CodeBlockType
  readonly change: RootBlockChange
}

const KEY_PREFIX = "block"
const KEY_SEPARATOR = ":"
const LABEL_SEPARATOR = " – "
const DELETED_TYPE: CodeBlockType = "deleted"
const UNKNOWN_DELETED_LABEL = "Code"
const UNFILTERED_TYPES: readonly CodeBlockType[] = ["import", "directive"]

const ROOT_BLOCK_CHANGE_LABELS: Readonly<Record<RootBlockChange, string>> = {
  added: "Added",
  modified: "Modified",
  deleted: "Deleted",
}

const rootOf = (block: CodeBlock): CodeBlock => (block.parentBlock === null ? block : rootOf(block.parentBlock))

const isWhollyAdded = (root: CodeBlock, source: SourceFile | null): boolean => {
  const span = source === null ? null : rootBlockSpanOf(root, source)
  const rows = (source?.lines ?? []).filter((_line, index) => isInSpan(index, span))
  return rows.length > 0 && rows.every((line) => line.mark === "added")
}

const markOf = (root: CodeBlock, source: SourceFile | null): RootBlockMark => {
  if (root.type === DELETED_TYPE) return { type: root.deletedType ?? DELETED_TYPE, change: "deleted" }
  return { type: root.type, change: isWhollyAdded(root, source) ? "added" : "modified" }
}

interface FilterMark {
  readonly classification: CodeBlockClassification
  readonly change: RootBlockChange
}

const keyOf = ({ classification, change }: FilterMark): RootBlockKey => `${KEY_PREFIX}${KEY_SEPARATOR}${classification}${KEY_SEPARATOR}${change}`

export const rootBlocksOf = (waypoint: Waypoint): CodeBlock[] => [...new Set(waypoint.codeBlocks.map(rootOf))]

const isUnfiltered = (mark: RootBlockMark): boolean => UNFILTERED_TYPES.includes(mark.type)

const filterMarkOf = (root: CodeBlock, source: SourceFile | null): FilterMark[] => {
  const mark = markOf(root, source)
  return isUnfiltered(mark) ? [] : [{ classification: classificationOfBlock(root), change: mark.change }]
}

export const rootBlockKeysOf = (rootBlocks: readonly CodeBlock[], source: SourceFile | null): RootBlockKey[] =>
  [...new Set(rootBlocks.flatMap((root) => filterMarkOf(root, source)).map(keyOf))]

export const rootBlockSpanOf = (root: CodeBlock, source: SourceFile): RowSpan | null => {
  const [{ start, end }] = root.lineOfCodeRangeReference
  return rowSpanOf(source, { lineStart: start.line, lineEnd: end.line })
}

const isClassification = (classification: string): classification is CodeBlockClassification =>
  CODE_BLOCK_CLASSIFICATIONS.some((known) => known === classification)

const isRootBlockChange = (change: string): change is RootBlockChange => ROOT_BLOCK_CHANGES.some((rootChange) => rootChange === change)

const markOfKey = (key: string): FilterMark | null => {
  const [prefix, classification, change, ...rest] = key.split(KEY_SEPARATOR)
  return prefix === KEY_PREFIX && rest.length === 0 && isClassification(classification) && isRootBlockChange(change) ? { classification, change } : null
}

export const classificationOfKey = (key: RootBlockKey): CodeBlockClassification | null => markOfKey(key)?.classification ?? null

export const isRootBlockKey = (key: string): key is RootBlockKey => markOfKey(key) !== null

const typeLabelOf = (type: CodeBlockType): string => (type === DELETED_TYPE ? UNKNOWN_DELETED_LABEL : BLOCK_TYPE_LABELS[type])

export interface RootBlockLabels {
  readonly typeLabel: string
  readonly change: RootBlockChange
  readonly changeLabel: string
}

export const rootBlockLabelsOf = (key: RootBlockKey): RootBlockLabels | null => {
  const mark = markOfKey(key)
  return mark === null
    ? null
    : { typeLabel: CODE_BLOCK_CLASSIFICATION_LABELS[mark.classification].label, change: mark.change, changeLabel: ROOT_BLOCK_CHANGE_LABELS[mark.change] }
}

export const labelsOfRootBlock = (root: CodeBlock, source: SourceFile | null): RootBlockLabels | null => {
  const mark = markOf(root, source)
  return isUnfiltered(mark) ? null : { typeLabel: typeLabelOf(mark.type), change: mark.change, changeLabel: ROOT_BLOCK_CHANGE_LABELS[mark.change] }
}

export const rootBlockLabelOf = (key: RootBlockKey): string => {
  const labels = rootBlockLabelsOf(key)
  return labels === null ? key : [labels.typeLabel, labels.changeLabel].join(LABEL_SEPARATOR)
}

const orderOf = (key: RootBlockKey): number => {
  const mark = markOfKey(key)
  return mark === null ? 0 : CODE_BLOCK_CLASSIFICATIONS.indexOf(mark.classification) * ROOT_BLOCK_CHANGES.length + ROOT_BLOCK_CHANGES.indexOf(mark.change)
}

export const compareRootBlockKeys = (one: RootBlockKey, two: RootBlockKey): number => orderOf(one) - orderOf(two)
