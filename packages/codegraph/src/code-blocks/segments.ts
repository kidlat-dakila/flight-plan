import type { CatalogueRuns } from "@flightplan/configurations"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "./stored-types"

export type CodeSegmentKind = "entry" | "shared"

export interface CodeSegment {
  readonly kind: CodeSegmentKind
  readonly filePaths: readonly string[]
}

interface FileUses {
  readonly usedBy: PathsByPath
  readonly uses: PathsByPath
  readonly handsOver: PathsByPath
  readonly layoutPaths: ReadonlySet<string>
}

interface FileUse {
  readonly userPath: string
  readonly usedPath: string
  readonly isHandingOver: boolean
  readonly isLayout: boolean
}

type PathsByPath = ReadonlyMap<string, ReadonlySet<string>>

type NextPathsOf = (filePath: string) => readonly string[]

const FEWEST_SHARING = 2
const NO_PATHS: ReadonlySet<string> = new Set()
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const CALLABLE_TYPES: ReadonlySet<StoredCodeBlock["type"]> = new Set<StoredCodeBlock["type"]>(["function", "hook", "component", "method", "class"])
const RENDERING: StoredCodeBlockSymbol["use"] = "render"
const RUNNING_HOLDER_TYPES: ReadonlySet<StoredCodeBlock["type"]> = new Set<StoredCodeBlock["type"]>(["function", "hook", "component", "method"])
const PAGE: CatalogueRuns = "page"
const PATH_SEPARATOR = "/"

const usedBlockOf = (symbol: StoredCodeBlockSymbol, blockById: ReadonlyMap<string, StoredCodeBlock>): StoredCodeBlock | null =>
  symbol.type === "external-block" ? (blockById.get(symbol.codeBlockId) ?? null) : null

const usedFilePathOf = (symbol: StoredCodeBlockSymbol, blockById: ReadonlyMap<string, StoredCodeBlock>): string | null =>
  symbol.type === "external-variable" ? symbol.filePath : (usedBlockOf(symbol, blockById)?.filePath ?? null)

const withAncestors = (block: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): StoredCodeBlock[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block] : [block, ...withAncestors(parent, blockById)]
}

const isRenderedOutsideRunningCode = (symbol: StoredCodeBlockSymbol, userBlock: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): boolean =>
  symbol.use === RENDERING && !withAncestors(userBlock, blockById).some((block) => RUNNING_HOLDER_TYPES.has(block.type))

const isPageSlot = (block: StoredCodeBlock): boolean => block.catalogue?.runs === PAGE

const listBlocksBelow = (block: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): StoredCodeBlock[] =>
  block.childrenBlockIds.flatMap((childId) => {
    const child = blockById.get(childId)
    return child === undefined ? [] : [child, ...listBlocksBelow(child, blockById)]
  })

const isPathWithin = (path: string, layoutPath: string): boolean =>
  path === layoutPath || path.startsWith(layoutPath.endsWith(PATH_SEPARATOR) ? layoutPath : `${layoutPath}${PATH_SEPARATOR}`)

const isLayoutSlot = (slot: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): boolean => {
  const layoutPath = slot.catalogue?.path ?? null
  const parent = slot.parentBlockId === null ? undefined : blockById.get(slot.parentBlockId)
  if (layoutPath === null || parent === undefined) return false
  const nestingBlocks = listBlocksBelow(parent, blockById).filter((block) => block.parentBlockId === parent.id && block.id !== slot.id && !isPageSlot(block))
  return nestingBlocks.some((nesting) =>
    listBlocksBelow(nesting, blockById).some((nested) => isPageSlot(nested) && nested.catalogue?.path != null && isPathWithin(nested.catalogue.path, layoutPath)),
  )
}

const isInLayoutSlot = (userBlock: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): boolean => {
  const slot = withAncestors(userBlock, blockById).find(isPageSlot)
  return slot !== undefined && isLayoutSlot(slot, blockById)
}

const isHandingOver = (symbol: StoredCodeBlockSymbol, userBlock: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): boolean => {
  const usedBlock = usedBlockOf(symbol, blockById)
  if (usedBlock === null || !CALLABLE_TYPES.has(usedBlock.type)) return false
  return NAMING_USES.has(symbol.use) || isRenderedOutsideRunningCode(symbol, userBlock, blockById)
}

const setsByKey = (pairs: readonly (readonly [string, string])[]): Map<string, Set<string>> =>
  new Map([...new Set(pairs.map(([key]) => key))].map((key) => [key, new Set(pairs.filter(([other]) => other === key).map(([, value]) => value))] as const))

const pathsOf = (pathsByPath: PathsByPath, filePath: string): readonly string[] => [...(pathsByPath.get(filePath) ?? NO_PATHS)]

export const listFileUses = ({ codeBlocks }: StoredCodeGroupGraph): FileUses => {
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const fileUses = codeBlocks.flatMap((block) =>
    block.outerSymbols.flatMap((symbol): FileUse[] => {
      const usedPath = usedFilePathOf(symbol, blockById)
      if (usedPath === null || usedPath === block.filePath) return []
      const isHandedOver = isHandingOver(symbol, block, blockById)
      return [{ userPath: block.filePath, usedPath, isHandingOver: isHandedOver, isLayout: isHandedOver && isInLayoutSlot(block, blockById) }]
    }),
  )
  const pairs = fileUses.map(({ userPath, usedPath }) => [userPath, usedPath] as const)
  const usedInPlace = setsByKey(fileUses.filter((use) => !use.isHandingOver).map(({ userPath, usedPath }) => [userPath, usedPath] as const))
  const handedOver = pairs.filter(([userPath, usedPath]) => !(usedInPlace.get(userPath)?.has(usedPath) ?? false))
  return {
    uses: setsByKey(pairs),
    usedBy: setsByKey(pairs.map(([user, used]) => [used, user] as const)),
    handsOver: setsByKey(handedOver),
    layoutPaths: new Set(fileUses.filter((use) => use.isLayout).map((use) => use.usedPath)),
  }
}

const reachPaths = (pendingPaths: readonly string[], nextPathsOf: NextPathsOf, reachedPaths: ReadonlySet<string> = NO_PATHS): ReadonlySet<string> => {
  const arrivingPaths = [...new Set(pendingPaths)].filter((filePath) => !reachedPaths.has(filePath))
  if (arrivingPaths.length === 0) return reachedPaths
  return reachPaths(arrivingPaths.flatMap(nextPathsOf), nextPathsOf, new Set([...reachedPaths, ...arrivingPaths]))
}

const reachBeyond = (filePath: string, nextPathsOf: NextPathsOf): string[] => [...reachPaths(nextPathsOf(filePath), nextPathsOf)].filter((reachedPath) => reachedPath !== filePath)

const listLineStarts = (hopPaths: readonly string[], linePaths: ReadonlySet<string>, { uses }: FileUses): ReadonlySet<string> => {
  const pathsBelow = (filePath: string): readonly string[] => (linePaths.has(filePath) ? [] : pathsOf(uses, filePath))
  return new Set([...reachPaths(hopPaths, pathsBelow)].filter((filePath) => linePaths.has(filePath)))
}

const listLinesHandedOver = (filePath: string, linePaths: ReadonlySet<string>, fileUses: FileUses): string[] => {
  const handedHops = pathsOf(fileUses.handsOver, filePath)
  const usedHops = pathsOf(fileUses.uses, filePath).filter((usedPath) => !handedHops.includes(usedPath))
  const usedInPlace = listLineStarts(usedHops, linePaths, fileUses)
  return [...listLineStarts(handedHops, linePaths, fileUses)].filter((startPath) => startPath !== filePath && !usedInPlace.has(startPath))
}

const inOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => (one < two ? -1 : Number(one > two)))

const listLines = (linePaths: ReadonlySet<string>, usersOnLine: NextPathsOf): ReadonlyMap<string, readonly string[]> => {
  const usersAbove = new Map([...linePaths].map((filePath) => [filePath, reachBeyond(filePath, usersOnLine).filter((userPath) => linePaths.has(userPath))] as const))
  const isHead = (filePath: string): boolean => (usersAbove.get(filePath) ?? []).length === 0
  const lineStartsOf = (filePath: string): string[] => {
    if (isHead(filePath)) return [filePath]
    const heads = (usersAbove.get(filePath) ?? []).filter(isHead)
    return heads.length === 0 ? inOrder([filePath, ...(usersAbove.get(filePath) ?? [])]).slice(0, 1) : heads
  }
  return new Map([...linePaths].map((filePath) => [filePath, lineStartsOf(filePath)] as const))
}

export const cutSegments = (group: StoredCodeGroupGraph): CodeSegment[] => {
  const fileUses = listFileUses(group)
  const changedPaths = new Set(group.astGraphs.filter((astGraph) => astGraph.diffBlockIds.length > 0).map((astGraph) => astGraph.filePath))
  const usedFromSeveral = [...changedPaths].filter((filePath) => (fileUses.usedBy.get(filePath)?.size ?? 0) >= FEWEST_SHARING)
  const layoutPaths = [...changedPaths].filter((filePath) => fileUses.layoutPaths.has(filePath))
  const commonPaths = new Set([...usedFromSeveral, ...layoutPaths])
  const branchingPaths = new Set([...changedPaths].filter((filePath) => !commonPaths.has(filePath)))
  const handingOverPaths = new Set([...branchingPaths].filter((filePath) => listLinesHandedOver(filePath, branchingPaths, fileUses).length >= FEWEST_SHARING))
  const linePaths = new Set([...branchingPaths].filter((filePath) => !handingOverPaths.has(filePath)))
  const isLineCut = (userPath: string, usedPath: string): boolean => handingOverPaths.has(userPath) && (fileUses.handsOver.get(userPath)?.has(usedPath) ?? false)
  const lineStartsByPath = listLines(linePaths, (filePath) => pathsOf(fileUses.usedBy, filePath).filter((userPath) => !isLineCut(userPath, filePath)))
  const onLines = inOrder([...linePaths]).flatMap((filePath) => {
    const lineStarts = lineStartsByPath.get(filePath) ?? []
    return lineStarts.length === 1 ? [{ filePath, line: lineStarts[0] }] : []
  })
  const sharedPaths = inOrder([...changedPaths].filter((filePath) => onLines.every((one) => one.filePath !== filePath)))
  const lines = [...new Set(onLines.map((one) => one.line))]
  const entries = lines.map((line): CodeSegment => ({ kind: "entry", filePaths: onLines.filter((one) => one.line === line).map((one) => one.filePath) }))
  if (sharedPaths.length === 0) return entries
  return entries.length === 0 ? [{ kind: "entry", filePaths: sharedPaths }] : [{ kind: "shared", filePaths: sharedPaths }, ...entries]
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
