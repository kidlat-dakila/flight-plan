import { cardRowNameOf, listCardRowNames, nameOfBlock, type CardRowKind } from "@flightplan/codegraph"
import type { BlockLabel, Position, SourceFile, TraceNode } from "@flightplan/configurations"

export type BlockLabelRowKind = CardRowKind | "block"

export interface BlockLabelRow {
  readonly kind: BlockLabelRowKind
  readonly name: string | null
}

export interface DescribedBlockLabel {
  readonly codeBlockId: string
  readonly at?: Position
  readonly kind: BlockLabelRowKind
  readonly name: string | null
  readonly label: string | null
}

export type BlockLabelRowOf = (listed: BlockLabel) => BlockLabelRow

const SITE_MARK = "@"
const POSITION_SEPARATOR = ":"

export const positionLabelOf = ({ line, column }: Position): string => `${String(line)}${POSITION_SEPARATOR}${String(column)}`

export const blockLabelKeyOf = (codeBlockId: string, at: Position | undefined): string =>
  at === undefined ? codeBlockId : `${codeBlockId}${SITE_MARK}${positionLabelOf(at)}`

const blockRowOf = ({ codeBlock }: BlockLabel): BlockLabelRow => ({ kind: "block", name: nameOfBlock(codeBlock) })

export const blockLabelRowsOf = (node: TraceNode, sources: readonly SourceFile[]): BlockLabelRowOf => {
  const rowNames = listCardRowNames(node, sources)
  return (listed) => cardRowNameOf(listed, rowNames) ?? blockRowOf(listed)
}

export const describeBlockLabels = (node: TraceNode, sources: readonly SourceFile[]): DescribedBlockLabel[] => {
  const rowOf = blockLabelRowsOf(node, sources)
  return node.blockLabels.map((listed) => {
    const { kind, name } = rowOf(listed)
    const placed = listed.at === undefined ? {} : { at: listed.at }
    return { codeBlockId: listed.codeBlock.id, ...placed, kind, name, label: listed.label }
  })
}
