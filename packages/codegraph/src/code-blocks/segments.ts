import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "./stored-types"

export type CodeSegmentKind = "entry" | "shared"

export interface CodeSegment {
  readonly kind: CodeSegmentKind
  readonly filePaths: readonly string[]
}

interface FileUses {
  readonly usedBy: ReadonlyMap<string, ReadonlySet<string>>
  readonly uses: ReadonlyMap<string, ReadonlySet<string>>
}

interface Cutting {
  readonly changedPaths: ReadonlySet<string>
  readonly fileUses: FileUses
  readonly usedFromSeveral: ReadonlySet<string>
}

type Walked = ReadonlySet<string>

const FEWEST_SHARING = 2
const NO_PATHS: ReadonlySet<string> = new Set()

const usedFilePathOf = (symbol: StoredCodeBlockSymbol, blockById: ReadonlyMap<string, StoredCodeBlock>): string | null => {
  if (symbol.type === "external-block") return blockById.get(symbol.codeBlockId)?.filePath ?? null
  return symbol.type === "external-variable" ? symbol.filePath : null
}

const setsByKey = (pairs: readonly (readonly [string, string])[]): Map<string, Set<string>> =>
  new Map([...new Set(pairs.map(([key]) => key))].map((key) => [key, new Set(pairs.filter(([other]) => other === key).map(([, value]) => value))] as const))

export const listFileUses = ({ codeBlocks }: StoredCodeGroupGraph): FileUses => {
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const pairs = codeBlocks.flatMap((block) =>
    block.outerSymbols.flatMap((symbol) => {
      const usedPath = usedFilePathOf(symbol, blockById)
      return usedPath === null || usedPath === block.filePath ? [] : [[block.filePath, usedPath] as const]
    }),
  )
  return { uses: setsByKey(pairs), usedBy: setsByKey(pairs.map(([user, used]) => [used, user] as const)) }
}

function listLinesBelow(filePath: string, cutting: Cutting, walked: Walked): ReadonlySet<string> {
  if (walked.has(filePath)) return NO_PATHS
  const below = new Set([...walked, filePath])
  return new Set([...(cutting.fileUses.uses.get(filePath) ?? NO_PATHS)].flatMap((usedPath) => [...listLinesThrough(usedPath, cutting, below)]))
}

function isShared(filePath: string, cutting: Cutting, walked: Walked): boolean {
  if (!cutting.changedPaths.has(filePath)) return false
  return cutting.usedFromSeveral.has(filePath) || listLinesBelow(filePath, cutting, walked).size >= FEWEST_SHARING
}

function lineOf(filePath: string, cutting: Cutting, walked: Walked): string {
  const below = [...listLinesBelow(filePath, cutting, walked)]
  return below.length === 0 ? filePath : below[0]
}

function listLinesThrough(filePath: string, cutting: Cutting, walked: Walked): ReadonlySet<string> {
  if (walked.has(filePath)) return NO_PATHS
  const isOnLine = cutting.changedPaths.has(filePath) && !isShared(filePath, cutting, walked)
  return isOnLine ? new Set([lineOf(filePath, cutting, walked)]) : listLinesBelow(filePath, cutting, walked)
}

const inOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => (one < two ? -1 : Number(one > two)))

export const cutSegments = (group: StoredCodeGroupGraph): CodeSegment[] => {
  const fileUses = listFileUses(group)
  const changedPaths = new Set(group.astGraphs.filter((astGraph) => astGraph.diffBlockIds.length > 0).map((astGraph) => astGraph.filePath))
  const usedFromSeveral = new Set([...changedPaths].filter((filePath) => (fileUses.usedBy.get(filePath)?.size ?? 0) >= FEWEST_SHARING))
  const cutting: Cutting = { changedPaths, fileUses, usedFromSeveral }
  const sharedPaths = inOrder([...changedPaths].filter((filePath) => isShared(filePath, cutting, NO_PATHS)))
  const onLines = inOrder([...changedPaths].filter((filePath) => !sharedPaths.includes(filePath))).map((filePath) => ({ filePath, line: lineOf(filePath, cutting, NO_PATHS) }))
  const lines = [...new Set(onLines.map((one) => one.line))]
  const entries = lines.map((line): CodeSegment => ({ kind: "entry", filePaths: onLines.filter((one) => one.line === line).map((one) => one.filePath) }))
  if (sharedPaths.length === 0) return entries
  return entries.length === 0 ? [{ kind: "entry", filePaths: sharedPaths }] : [{ kind: "shared", filePaths: sharedPaths }, ...entries]
}

const withAncestors = (block: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): StoredCodeBlock[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block] : [block, ...withAncestors(parent, blockById)]
}

const reachUsers = (pending: readonly StoredCodeBlock[], blockById: ReadonlyMap<string, StoredCodeBlock>, reachedIds: ReadonlySet<string>): ReadonlySet<string> => {
  const holding = pending.flatMap((block) => withAncestors(block, blockById)).filter((block) => !reachedIds.has(block.id))
  if (holding.length === 0) return reachedIds
  const users = holding.flatMap((block) => block.usedByIds).flatMap((userId) => {
    const user = blockById.get(userId)
    return user === undefined ? [] : [user]
  })
  return reachUsers(users, blockById, new Set([...reachedIds, ...holding.map((block) => block.id)]))
}

export const listBlocksUsing = ({ codeBlocks }: StoredCodeGroupGraph, filePaths: readonly string[], sharedFilePaths: readonly string[] = []): StoredCodeBlock[] => {
  const followedById = new Map(codeBlocks.filter((block) => !sharedFilePaths.includes(block.filePath)).map((block) => [block.id, block] as const))
  const changed = codeBlocks.filter((block) => block.lineOfCodeDiffs !== null && filePaths.includes(block.filePath))
  const reachedIds = reachUsers(changed, followedById, new Set())
  return codeBlocks.filter((block) => reachedIds.has(block.id))
}

export const listReachedFilePaths = (group: StoredCodeGroupGraph, filePaths: readonly string[], sharedFilePaths: readonly string[] = []): string[] => {
  const changedPaths = new Set(group.astGraphs.filter((astGraph) => astGraph.diffBlockIds.length > 0).map((astGraph) => astGraph.filePath))
  return inOrder([...new Set(listBlocksUsing(group, filePaths, sharedFilePaths).map((block) => block.filePath))].filter((filePath) => !changedPaths.has(filePath)))
}
