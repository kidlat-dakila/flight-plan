import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import { Memo } from "@/shared/memo"
import { walkBreadthFirstInTurns } from "@/shared/reach"
import { compareRanges, containsRange, rangeKey, touchesRange } from "./source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CodeBlockDiff, CodeBlockType, SourceRange } from "./types"

export interface TracedFile {
  readonly filePath: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

type BlockById = ReadonlyMap<string, StoredCodeBlock>

type ImportedPathsOf = (filePath: string) => readonly string[]

const AFFECTED: CodeBlockDiff["type"] = "affected"
const ARGUMENT: CodeBlockType = "root-argument-value"
const NO_PATHS: readonly string[] = []

export const listFilesFromRoots = (files: readonly TracedFile[], rootFilePaths: readonly string[]): string[] => {
  const filePaths = files.map((file) => file.filePath)
  const groupPaths = new Set(filePaths)
  const importedByPath = new Map(files.map((file) => [file.filePath, [...file.importedFilePaths.values()].filter((imported) => groupPaths.has(imported))] as const))
  const importedPathsOf: ImportedPathsOf = (filePath) => importedByPath.get(filePath) ?? NO_PATHS
  const rootPaths = rootFilePaths.filter((filePath) => groupPaths.has(filePath))
  return [...walkBreadthFirstInTurns([rootPaths, ...filePaths.map((filePath) => [filePath])], { nextOf: importedPathsOf, keyOf: (filePath) => filePath })]
}

const isOwnChange = (diff: CodeBlockDiff, block: StoredCodeBlock): boolean =>
  diff.type !== AFFECTED && block.lineOfCodeRangeReference.some((range) => touchesRange(range, diff.range))

const usedBlockIdOf = (symbol: StoredCodeBlockSymbol): string | null => {
  if (symbol.member?.blockId != null) return symbol.member.blockId
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null
}

const namedIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

const isReadMorePrecisely = (symbol: StoredCodeBlockSymbol, user: StoredCodeBlock): boolean => {
  const namedId = namedIdOf(symbol)
  if (namedId === null || symbol.member?.blockId !== null) return false
  return user.outerSymbols.some((other) => other.member?.blockId != null && namedIdOf(other) === namedId && containsRange(other.usedAt, symbol.usedAt))
}

const isWider = (outer: SourceRange, inner: SourceRange): boolean => containsRange(outer, inner) && !containsRange(inner, outer)

const listIdsAround = (block: StoredCodeBlock, blockById: BlockById): string[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block.id] : [block.id, ...listIdsAround(parent, blockById)]
}

const isWrittenInside = (inner: StoredCodeBlock, outer: StoredCodeBlock): boolean =>
  inner.filePath === outer.filePath
  && inner.lineOfCodeRangeReference.every((innerRange) => outer.lineOfCodeRangeReference.some((outerRange) => containsRange(outerRange, innerRange)))

const isOutside = (used: StoredCodeBlock, user: StoredCodeBlock, blockById: BlockById): boolean =>
  !listIdsAround(user, blockById).includes(used.id) && !listIdsAround(used, blockById).includes(user.id) && !isWrittenInside(used, user)

const withAffected = (block: StoredCodeBlock, usedAt: readonly SourceRange[]): StoredCodeBlock => {
  if (usedAt.length === 0) return block
  const affected = firstOfEach(usedAt, rangeKey).map((range): CodeBlockDiff => ({ type: AFFECTED, range }))
  return { ...block, diffs: [...block.diffs.filter((diff) => diff.type !== AFFECTED), ...affected].sort((one, two) => compareRanges(one.range, two.range)) }
}

export const traceAffectedDiffs = (files: readonly TracedFile[], rootFilePaths: readonly string[], blocks: readonly StoredCodeBlock[]): StoredCodeBlock[] => {
  const blockById: BlockById = new Map(blocks.map((block) => [block.id, block] as const))
  const blocksByPath = groupBy(blocks, (block) => block.filePath)
  const held = new Memo<string, boolean>()
  const holdsChange = (blockId: string): boolean =>
    held.remember(blockId, () => {
      const block = blockById.get(blockId)
      return block !== undefined && (block.diffs.some((diff) => isOwnChange(diff, block)) || block.childrenBlockIds.some(holdsChange))
    })
  const listUsesOfChange = (user: StoredCodeBlock): SourceRange[] => {
    const uses = user.outerSymbols.flatMap((symbol) => {
      const used = isReadMorePrecisely(symbol, user) ? undefined : blockById.get(usedBlockIdOf(symbol) ?? "")
      return used !== undefined && used.type !== ARGUMENT && isOutside(used, user, blockById) && holdsChange(used.id) ? [{ usedId: used.id, usedAt: symbol.usedAt }] : []
    })
    return uses.filter((use) => !uses.some((other) => other.usedId === use.usedId && isWider(other.usedAt, use.usedAt))).map((use) => use.usedAt)
  }
  const usedAtById = new Map(
    listFilesFromRoots(files, rootFilePaths).flatMap((filePath) => (blocksByPath.get(filePath) ?? []).map((block) => [block.id, listUsesOfChange(block)] as const)),
  )
  return blocks.map((block) => withAffected(block, usedAtById.get(block.id) ?? []))
}
