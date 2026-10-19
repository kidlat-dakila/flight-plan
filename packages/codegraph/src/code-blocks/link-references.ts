import { groupBy } from "@/shared/group-by"
import type { ExportTable } from "./export-table"
import type { FileReading, HandingSlot, ReadBlock, ReadTarget, ReadUse, WrittenAt } from "./reading"
import { containsRange, positionKey } from "./source-range"
import type { StoredASTGraph, StoredCodeBlock, StoredCodeBlockSymbol, StoredExports, StoredSymbolMember, StoredSymbolPlace } from "./stored-types"
import type { CodeBlockType, Position, SourceRange } from "./types"

export interface ReferenceDetails {
  readonly memberPathById: ReadonlyMap<string, readonly string[]>
  readonly writtenAtBySymbol: ReadonlyMap<StoredCodeBlockSymbol, WrittenAt>
}

export interface LinkedReferences {
  readonly codeBlocks: readonly StoredCodeBlock[]
  readonly astGraphs: readonly StoredASTGraph[]
  readonly details: ReferenceDetails
}

interface PlacedBlock {
  readonly filePath: string
  readonly block: ReadBlock
}

interface HeldSymbol {
  readonly holderId: string
  readonly symbol: StoredCodeBlockSymbol
  readonly writtenAt: WrittenAt
}

interface BlockIndex {
  readonly blockById: ReadonlyMap<string, PlacedBlock>
  readonly childrenById: ReadonlyMap<string | null, readonly PlacedBlock[]>
  readonly blockIdByDeclaration: ReadonlyMap<string, string>
  readonly exports: ExportTable
}

const MEMBER_ROLE = "member"
const WHOLE_ROLE = "whole"
const KEY_ROLE = "key"
const FIRST_PARAMETER = 0
const RENDER_ROOT = "render-root"
const PAGE_SLOT = "page"
const RETURNED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method"])
const EXTERNAL_TYPES: ReadonlySet<StoredCodeBlockSymbol["type"]> = new Set<StoredCodeBlockSymbol["type"]>([
  "external-variable",
  "external-block",
  "unopened-import",
])

const declarationKey = (filePath: string, declaredAt: Position): string => `${filePath}#${positionKey(declaredAt)}`

const createBlockIndex = (readings: readonly FileReading[], exports: ExportTable): BlockIndex => {
  const placed = readings.flatMap(({ filePath, blocks }) => blocks.map((block) => ({ filePath, block })))
  return {
    blockById: new Map(placed.map((one) => [one.block.id, one] as const)),
    childrenById: groupBy(placed, (one) => one.block.parentId),
    blockIdByDeclaration: new Map(
      placed.flatMap(({ filePath, block }) => block.declaredAt.map((declaredAt) => [declarationKey(filePath, declaredAt), block.id] as const)),
    ),
    exports,
  }
}

const childrenOf = (index: BlockIndex, blockId: string): readonly ReadBlock[] => (index.childrenById.get(blockId) ?? []).map((one) => one.block)

const isHolding = (block: ReadBlock, range: SourceRange): boolean =>
  block.argument?.role !== MEMBER_ROLE && block.ranges.some((held) => containsRange(held, range))

const findHolder = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null =>
  blocks.reduce<ReadBlock | null>((innermost, block) => {
    if (!isHolding(block, range)) return innermost
    return innermost === null || containsRange(innermost.ranges[0], block.ranges[0]) ? block : innermost
  }, null)

const blockIdOfTarget = (target: ReadTarget, filePath: string, index: BlockIndex): string | null => {
  if (target.kind === "local") return index.blockIdByDeclaration.get(declarationKey(filePath, target.declarationRange.start)) ?? null
  const found = target.filePath === null ? null : index.exports.findExport(target.filePath, target.importedName)
  return found === null ? null : (index.blockIdByDeclaration.get(declarationKey(found.filePath, found.declarationRange.start)) ?? null)
}

const findArgument = (receiverId: string, slot: HandingSlot, index: BlockIndex): string | null => {
  const taken = childrenOf(index, receiverId).filter((child) => child.argument !== undefined)
  if (typeof slot === "number") return taken.find((child) => child.argument?.role === WHOLE_ROLE && child.argument.parameterIndex === slot)?.id ?? null
  const first = taken.filter((child) => child.argument?.parameterIndex === FIRST_PARAMETER)
  const key = first.find((child) => child.argument?.role === KEY_ROLE && child.name === slot)
  if (key !== undefined) return key.id
  const whole = first.find((child) => child.argument?.role === WHOLE_ROLE)
  const member = whole === undefined ? undefined : childrenOf(index, whole.id).find((candidate) => candidate.name === slot)
  return member?.id ?? taken.find((child) => child.argument?.role === WHOLE_ROLE && child.name === slot)?.id ?? null
}

const handedToIdOf = ({ handing }: ReadUse, filePath: string, index: BlockIndex): string | null => {
  const receiverId = handing === null ? null : blockIdOfTarget(handing.receiver, filePath, index)
  return handing === null || receiverId === null ? null : findArgument(receiverId, handing.slot, index)
}

const handedToOf = (use: ReadUse, filePath: string, index: BlockIndex): { handedToId?: string | null } => {
  const handedToId = handedToIdOf(use, filePath, index)
  if (use.use === "value") return { handedToId }
  return use.use === "read" && handedToId !== null ? { handedToId } : {}
}

const memberOf = ({ memberPath }: ReadUse, targetId: string | null, index: BlockIndex): { member?: StoredSymbolMember } => {
  if (memberPath.length === 0) return {}
  const target = targetId === null ? undefined : index.blockById.get(targetId)?.block
  if (target === undefined) return { member: { path: memberPath, blockId: null } }
  const taken = target.argument?.role === WHOLE_ROLE ? childrenOf(index, target.id).find((child) => child.name === memberPath[0]) : undefined
  return { member: { path: memberPath, blockId: taken?.id ?? null } }
}

const isInReturnedMarkup = (block: ReadBlock, index: BlockIndex): boolean => {
  if (block.type === RENDER_ROOT || block.catalogue?.runs === PAGE_SLOT) return true
  const parent = block.parentId === null ? undefined : index.blockById.get(block.parentId)
  return parent !== undefined && isInReturnedMarkup(parent.block, index)
}

const asUsedIn = (use: ReadUse, holder: ReadBlock, index: BlockIndex): ReadUse =>
  use.use === "render" && !isInReturnedMarkup(holder, index) ? { ...use, use: "value" } : use

const bindingOf = (importedName: string, targetId: string, index: BlockIndex): { binding?: string } => {
  const target = index.blockById.get(targetId)?.block
  return target !== undefined && target.declaredAt.length > 1 && target.name !== importedName ? { binding: importedName } : {}
}

const symbolOf = (use: ReadUse, filePath: string, index: BlockIndex): StoredCodeBlockSymbol => {
  const { target } = use
  const targetId = blockIdOfTarget(target, filePath, index)
  const usage = {
    usedAt: use.usedAt,
    use: use.use,
    ...handedToOf(use, filePath, index),
    ...memberOf(use, targetId, index),
  }
  if (target.kind === "local") {
    return targetId === null
      ? { ...usage, type: "internal-variable", lineOfCodeReference: target.declarationRange }
      : { ...usage, type: "internal-code-block", codeBlockId: targetId }
  }
  if (targetId !== null) return { ...usage, type: "external-block", codeBlockId: targetId, ...bindingOf(target.importedName, targetId, index) }
  const found = target.filePath === null ? null : index.exports.findExport(target.filePath, target.importedName)
  if (found !== null) return { ...usage, type: "external-variable", lineOfCodeReference: found.declarationRange, filePath: found.filePath }
  return { ...usage, type: "unopened-import", specifier: target.specifier, importedName: target.importedName, isLibrary: target.filePath === null }
}

const isDeclaredInside = ({ target }: ReadUse, holder: ReadBlock, filePath: string, index: BlockIndex): boolean => {
  if (target.kind !== "local") return false
  const declaredId = blockIdOfTarget(target, filePath, index)
  const isAnotherBlock = declaredId !== null && declaredId !== holder.id
  return !isAnotherBlock && holder.ranges.some((range) => containsRange(range, target.declarationRange))
}

const holdSymbols = ({ filePath, blocks, uses }: FileReading, index: BlockIndex): HeldSymbol[] =>
  uses.flatMap((use) => {
    const holder = findHolder(blocks, use.usedAt)
    if (holder === null || isDeclaredInside(use, holder, filePath, index)) return []
    return [{ holderId: holder.id, symbol: symbolOf(asUsedIn(use, holder, index), filePath, index), writtenAt: use.writtenAt }]
  })

const referencedIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

const placesOf = (blocks: readonly StoredCodeBlock[], isWanted: (symbol: StoredCodeBlockSymbol) => boolean): StoredSymbolPlace[] =>
  blocks.flatMap((block) =>
    block.outerSymbols.flatMap((symbol, symbolIndex) => (isWanted(symbol) ? [{ blockId: block.id, symbolIndex }] : [])),
  )

const exportsOfFile = (filePath: string, index: BlockIndex): StoredExports =>
  Object.fromEntries(
    index.exports.listExportedNames(filePath).flatMap((exportedName) => {
      const found = index.exports.findExport(filePath, exportedName)
      if (found === null) return []
      const blockId = index.blockIdByDeclaration.get(declarationKey(found.filePath, found.declarationRange.start))
      return [[exportedName, blockId ?? found.declarationRange] as const]
    }),
  )

const distinct = <Item>(items: readonly Item[]): Item[] => [...new Set(items)]

export const linkReferences = (readings: readonly FileReading[], exports: ExportTable): LinkedReferences => {
  const index = createBlockIndex(readings, exports)
  const held = readings.flatMap((reading) => holdSymbols(reading, index))
  const symbolsByHolder = groupBy(held, (one) => one.holderId)
  const usersByBlock = groupBy(
    held.flatMap(({ holderId, symbol }) => {
      const referencedId = referencedIdOf(symbol)
      return referencedId === null ? [] : [{ referencedId, holderId }]
    }),
    (one) => one.referencedId,
  )
  const handedByBlock = groupBy(
    held.flatMap(({ holderId, symbol }) => {
      const symbolIndex = (symbolsByHolder.get(holderId) ?? []).findIndex((one) => one.symbol === symbol)
      return symbol.handedToId === undefined || symbol.handedToId === null ? [] : [{ handedToId: symbol.handedToId, place: { blockId: holderId, symbolIndex } }]
    }),
    (one) => one.handedToId,
  )
  const exportsByPath = new Map(readings.map(({ filePath }) => [filePath, exportsOfFile(filePath, index)] as const))
  const exportersByBlock = groupBy(
    [...exportsByPath].flatMap(([filePath, fileExports]) =>
      Object.values(fileExports).flatMap((exported) => (typeof exported === "string" ? [{ blockId: exported, filePath }] : [])),
    ),
    (one) => one.blockId,
  )

  const storedOf = ({ filePath, block }: PlacedBlock): StoredCodeBlock => {
    const exportedByFilePaths = distinct((exportersByBlock.get(block.id) ?? []).map((one) => one.filePath))
    return {
      id: block.id,
      ...(block.name === undefined ? {} : { name: block.name }),
      type: block.type,
      lineOfCodeRangeReference: block.ranges,
      parentBlockId: block.parentId,
      childrenBlockIds: childrenOf(index, block.id).map((child) => child.id),
      isRoot: block.parentId === null,
      isExported: exportedByFilePaths.length > 0,
      ...(block.isPlain === true ? { isPlain: true } : {}),
      ...(block.isParameterProperty === true ? { isParameterProperty: true } : {}),
      ...(block.isAnnotatedAlias === true ? { isAnnotatedAlias: true } : {}),
      ...(block.isReturned === true && RETURNED_TYPES.has(block.type) ? { isReturned: true } : {}),
      exportedByFilePaths,
      lineOfCodeDiffs: null,
      diffs: [],
      diffSourceIds: [],
      classifications: [],
      diffClassifications: [],
      outerSymbols: (symbolsByHolder.get(block.id) ?? []).map((one) => one.symbol),
      usedByIds: distinct((usersByBlock.get(block.id) ?? []).map((one) => one.holderId)),
      nextBlockIds: [],
      handedFrom: (handedByBlock.get(block.id) ?? []).map((one) => one.place),
      filePath,
      catalogue: block.catalogue ?? null,
      ...(block.card === undefined ? {} : { card: block.card }),
    }
  }

  const codeBlocks = [...index.blockById.values()].map(storedOf)
  const blocksByPath = groupBy(codeBlocks, (block) => block.filePath)

  const graphOf = ({ filePath }: FileReading): StoredASTGraph => {
    const stored = blocksByPath.get(filePath) ?? []
    const renderRootBlockIds = stored.filter((block) => block.type === RENDER_ROOT).map((block) => block.id)
    return {
      filePath,
      codeBlockIds: stored.map((block) => block.id),
      rootBlockIds: stored.filter((block) => block.isRoot).map((block) => block.id),
      diffBlockIds: [],
      diffContains: [],
      ...(renderRootBlockIds.length === 0 ? {} : { renderRootBlockIds }),
      externalSymbols: placesOf(stored, (symbol) => EXTERNAL_TYPES.has(symbol.type)),
      externalBlockIds: distinct(stored.flatMap((block) => block.outerSymbols.flatMap((symbol) => (symbol.type === "external-block" ? [symbol.codeBlockId] : [])))),
      exports: exportsByPath.get(filePath) ?? {},
    }
  }

  const details: ReferenceDetails = {
    memberPathById: new Map([...index.blockById.values()].flatMap(({ block }) => (block.memberPath === undefined ? [] : [[block.id, block.memberPath] as const]))),
    writtenAtBySymbol: new Map(held.map(({ symbol, writtenAt }) => [symbol, writtenAt] as const)),
  }

  return { codeBlocks, astGraphs: readings.map(graphOf), details }
}
