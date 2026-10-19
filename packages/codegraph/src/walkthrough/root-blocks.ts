import { isInSpan, rowSpanOf, type RowSpan } from "@/code/lines"
import { BLOCK_TYPE_LABELS } from "@/trace/names"
import {
  CODE_BLOCK_TYPES,
  ROOT_BLOCK_CHANGES,
  type CodeBlock,
  type CodeBlockType,
  type RootBlockChange,
  type SourceFile,
  type Waypoint,
} from "@flightplan/configurations"

export type RootBlockKey = `block:${CodeBlockType}:${RootBlockChange}`

interface RootBlockMark {
  readonly type: CodeBlockType
  readonly change: RootBlockChange
}

const KEY_PREFIX = "block"
const KEY_SEPARATOR = ":"
const LABEL_SEPARATOR = " – "
const DELETED_TYPE: CodeBlockType = "deleted"
const UNKNOWN_DELETED_LABEL = "Code"
const UNFILTERED_TYPES: readonly CodeBlockType[] = ["import"]

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

const keyOf = ({ type, change }: RootBlockMark): RootBlockKey => `${KEY_PREFIX}${KEY_SEPARATOR}${type}${KEY_SEPARATOR}${change}`

export const rootBlocksOf = (waypoint: Waypoint): CodeBlock[] => [...new Set(waypoint.codeBlocks.map(rootOf))]

const isUnfiltered = (mark: RootBlockMark): boolean => UNFILTERED_TYPES.includes(mark.type)

export const rootBlockKeysOf = (rootBlocks: readonly CodeBlock[], source: SourceFile | null): RootBlockKey[] =>
  [...new Set(rootBlocks.map((root) => markOf(root, source)).filter((mark) => !isUnfiltered(mark)).map(keyOf))]

export const rootBlockSpanOf = (root: CodeBlock, source: SourceFile): RowSpan | null => {
  const [{ start, end }] = root.lineOfCodeRangeReference
  return rowSpanOf(source, { lineStart: start.line, lineEnd: end.line })
}

const isBlockType = (type: string): type is CodeBlockType => CODE_BLOCK_TYPES.some((blockType) => blockType === type)

const isRootBlockChange = (change: string): change is RootBlockChange => ROOT_BLOCK_CHANGES.some((rootChange) => rootChange === change)

const markOfKey = (key: string): RootBlockMark | null => {
  const [prefix, type, change, ...rest] = key.split(KEY_SEPARATOR)
  return prefix === KEY_PREFIX && rest.length === 0 && isBlockType(type) && isRootBlockChange(change) ? { type, change } : null
}

export const isRootBlockKey = (key: string): key is RootBlockKey => markOfKey(key) !== null

const typeLabelOf = (type: CodeBlockType): string => (type === DELETED_TYPE ? UNKNOWN_DELETED_LABEL : BLOCK_TYPE_LABELS[type])

export interface RootBlockLabels {
  readonly typeLabel: string
  readonly change: RootBlockChange
  readonly changeLabel: string
}

export const rootBlockLabelsOf = (key: RootBlockKey): RootBlockLabels | null => {
  const mark = markOfKey(key)
  return mark === null ? null : { typeLabel: typeLabelOf(mark.type), change: mark.change, changeLabel: ROOT_BLOCK_CHANGE_LABELS[mark.change] }
}

export const rootBlockLabelOf = (key: RootBlockKey): string => {
  const labels = rootBlockLabelsOf(key)
  return labels === null ? key : [labels.typeLabel, labels.changeLabel].join(LABEL_SEPARATOR)
}

const orderOf = (key: RootBlockKey): number => {
  const mark = markOfKey(key)
  return mark === null ? 0 : CODE_BLOCK_TYPES.indexOf(mark.type) * ROOT_BLOCK_CHANGES.length + ROOT_BLOCK_CHANGES.indexOf(mark.change)
}

export const compareRootBlockKeys = (one: RootBlockKey, two: RootBlockKey): number => orderOf(one) - orderOf(two)
