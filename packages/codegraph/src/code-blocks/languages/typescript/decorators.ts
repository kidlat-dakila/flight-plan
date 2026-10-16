import type { ReadBlock } from "@/code-blocks/reading"
import { containsRange } from "@/code-blocks/source-range"
import type { CodeBlockType } from "@/code-blocks/types"

const DECORATED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["class", "method", "property"])

const isDecorating = (block: ReadBlock, declaration: ReadBlock): boolean =>
  declaration.id !== block.id
  && declaration.parentId === block.parentId
  && DECORATED_TYPES.has(declaration.type)
  && containsRange(declaration.ranges[0], block.ranges[0])

export const withDecoratorsInside = (blocks: readonly ReadBlock[]): ReadBlock[] =>
  blocks.map((block) => {
    const declaration = blocks.find((candidate) => isDecorating(block, candidate))
    return declaration === undefined ? block : { ...block, parentId: declaration.id }
  })
