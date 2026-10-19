import {
  CODE_BLOCK_CLASSIFICATION_LABELS,
  CODE_BLOCK_CLASSIFICATIONS,
  type CodeBlock,
  type CodeBlockClassification,
  type SpotlightView,
} from "@flightplan/configurations"

export const SPOTLIGHT_LABEL = "Spotlight"

export const spotlightClassificationsOf = (
  blocks: readonly Pick<CodeBlock, "diffClassifications">[],
  spotlight: readonly CodeBlockClassification[],
): CodeBlockClassification[] => {
  const changed = new Set(blocks.flatMap((block) => block.diffClassifications))
  return CODE_BLOCK_CLASSIFICATIONS.filter((classification) => spotlight.includes(classification) && changed.has(classification))
}

export const isInSpotlight = (
  blocks: readonly Pick<CodeBlock, "diffClassifications">[],
  spotlight: readonly CodeBlockClassification[],
): boolean => spotlightClassificationsOf(blocks, spotlight).length > 0

export const spotlightViewOf = (
  blocks: readonly Pick<CodeBlock, "diffClassifications">[],
  spotlight: readonly CodeBlockClassification[],
): SpotlightView | null => {
  const classifications = spotlightClassificationsOf(blocks, spotlight)
  return classifications.length === 0
    ? null
    : {
        label: SPOTLIGHT_LABEL,
        classifications: classifications.map((key) => ({ key, label: CODE_BLOCK_CLASSIFICATION_LABELS[key].label })),
      }
}
