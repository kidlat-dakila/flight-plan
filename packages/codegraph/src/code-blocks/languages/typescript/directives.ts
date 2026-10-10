import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { FileExports, ReadBlock } from "@/code-blocks/reading"
import { containsRange, positionKey } from "@/code-blocks/source-range"
import type { CodeBlockCatalogue, CodeBlockType, SourceRange } from "@/code-blocks/types"

const DIRECTIVE_SITE: PatternMatch["site"] = "directive"
const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "method"])

const catalogueOf = ({ specifier, name, runs, method, versions }: PatternMatch): CodeBlockCatalogue => ({
  specifier,
  name,
  runs,
  path: null,
  method,
  event: null,
  certainty: versions === null ? "proven" : "assumed",
})

const isCallable = (block: ReadBlock): boolean => CALLABLE_TYPES.has(block.type) && block.argument === undefined

const isHolding = (block: ReadBlock, range: SourceRange): boolean => block.ranges.some((held) => containsRange(held, range))

const innermostAround = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null =>
  blocks
    .filter((block) => isCallable(block) && isHolding(block, range))
    .reduce<ReadBlock | null>((innermost, block) => (innermost === null || isHolding(innermost, block.ranges[0]) ? block : innermost), null)

const listExportedFunctions = (blocks: readonly ReadBlock[], exports: FileExports): ReadBlock[] => {
  const exportedAt = new Set(exports.local.filter((exported) => exported.isFunction).map((exported) => positionKey(exported.declarationRange.start)))
  return blocks.filter((block) => isCallable(block) && block.declaredAt.some((declaredAt) => exportedAt.has(positionKey(declaredAt))))
}

const namedBy = (directive: PatternMatch, blocks: readonly ReadBlock[], exports: FileExports): ReadBlock[] => {
  const holder = innermostAround(blocks, directive.range)
  return holder === null ? listExportedFunctions(blocks, exports) : [holder]
}

export const withDirectives = (blocks: readonly ReadBlock[], matches: readonly PatternMatch[], exports: FileExports): ReadBlock[] => {
  const catalogueById = new Map(
    matches
      .filter((match) => match.site === DIRECTIVE_SITE)
      .flatMap((directive) => namedBy(directive, blocks, exports).map((block) => [block.id, catalogueOf(directive)] as const)),
  )
  return blocks.map((block) => {
    const said = catalogueById.get(block.id)
    return said === undefined || block.catalogue !== undefined ? block : { ...block, catalogue: said }
  })
}
