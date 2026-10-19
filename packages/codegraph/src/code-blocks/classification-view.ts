import {
  CODE_BLOCK_CLASSIFICATION_LABELS,
  primaryClassificationOf,
  type ClassificationView,
  type CodeBlock,
  type CodeBlockClassification,
} from "@flightplan/configurations"

const UNCLASSIFIED: CodeBlockClassification = "logic"

export const classificationOfBlock = (block: Pick<CodeBlock, "classifications">): CodeBlockClassification =>
  primaryClassificationOf(block.classifications) ?? UNCLASSIFIED

export const classificationViewOf = (block: Pick<CodeBlock, "classifications">): ClassificationView => {
  const key = classificationOfBlock(block)
  return { key, label: CODE_BLOCK_CLASSIFICATION_LABELS[key].label }
}
