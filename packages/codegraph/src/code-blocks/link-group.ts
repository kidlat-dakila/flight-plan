import { once } from "@/shared/memo"
import type { StoredASTGraph, StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph, StoredSymbolPlace } from "./stored-types"
import type { ASTCodeGroupGraph, ASTGraph, CodeBlock, CodeBlockSymbol, SourceRange, SymbolUsage } from "./types"

interface GroupLookup {
  readonly blockOf: (blockId: string) => CodeBlock
  readonly graphOf: (filePath: string) => ASTGraph
}

const found = <Linked>(linkedByKey: ReadonlyMap<string, Linked>, key: string): Linked => {
  const linked = linkedByKey.get(key)
  if (linked === undefined) throw new Error(`The group holds nothing under ${key}.`)
  return linked
}

const usageOf = ({ usedAt, use, handedToId, member }: StoredCodeBlockSymbol, { blockOf }: GroupLookup): SymbolUsage => ({
  usedAt,
  use,
  ...(handedToId === undefined ? {} : { handedTo: handedToId === null ? null : blockOf(handedToId) }),
  ...(member === undefined ? {} : { member: { path: member.path, block: member.blockId === null ? null : blockOf(member.blockId) } }),
})

const linkSymbol = (stored: StoredCodeBlockSymbol, lookup: GroupLookup): CodeBlockSymbol => {
  const usage = usageOf(stored, lookup)
  if (stored.type === "internal-variable") return { ...usage, type: stored.type, lineOfCodeReference: stored.lineOfCodeReference }
  if (stored.type === "external-variable") {
    return { ...usage, type: stored.type, lineOfCodeReference: stored.lineOfCodeReference, astGraph: lookup.graphOf(stored.filePath) }
  }
  if (stored.type === "unopened-import") {
    return { ...usage, type: stored.type, specifier: stored.specifier, importedName: stored.importedName, isLibrary: stored.isLibrary }
  }
  return { ...usage, type: stored.type, codeBlockReference: lookup.blockOf(stored.codeBlockId) }
}

const symbolAt = ({ blockId, symbolIndex }: StoredSymbolPlace, { blockOf }: GroupLookup): CodeBlockSymbol => blockOf(blockId).outerSymbols[symbolIndex]

const linkBlock = (stored: StoredCodeBlock, lookup: GroupLookup): CodeBlock => {
  const blocksOf = (blockIds: readonly string[]): (() => CodeBlock[]) => once(() => blockIds.map(lookup.blockOf))
  const childrenBlocks = blocksOf(stored.childrenBlockIds)
  const diffSources = blocksOf(stored.diffSourceIds)
  const usedBy = blocksOf(stored.usedByIds)
  const nextBlocks = blocksOf(stored.nextBlockIds)
  const exportedBy = once(() => stored.exportedByFilePaths.map(lookup.graphOf))
  const outerSymbols = once(() => stored.outerSymbols.map((symbol) => linkSymbol(symbol, lookup)))
  const handedFrom = once(() => stored.handedFrom.map((place) => symbolAt(place, lookup)))
  return {
    id: stored.id,
    ...(stored.name === undefined ? {} : { name: stored.name }),
    type: stored.type,
    ...(stored.deletedType === undefined ? {} : { deletedType: stored.deletedType }),
    lineOfCodeRangeReference: stored.lineOfCodeRangeReference,
    isRoot: stored.isRoot,
    isExported: stored.isExported,
    lineOfCodeDiffs: stored.lineOfCodeDiffs,
    diffs: stored.diffs,
    catalogue: stored.catalogue,
    get parentBlock() {
      return stored.parentBlockId === null ? null : lookup.blockOf(stored.parentBlockId)
    },
    get childrenBlocks() {
      return childrenBlocks()
    },
    get exportedBy() {
      return exportedBy()
    },
    get diffSources() {
      return diffSources()
    },
    get outerSymbols() {
      return outerSymbols()
    },
    get usedBy() {
      return usedBy()
    },
    get nextBlocks() {
      return nextBlocks()
    },
    get handedFrom() {
      return handedFrom()
    },
    get astGraph() {
      return lookup.graphOf(stored.filePath)
    },
  }
}

const linkGraph = (stored: StoredASTGraph, lookup: GroupLookup): ASTGraph => {
  const blocksOf = (blockIds: readonly string[]): (() => CodeBlock[]) => once(() => blockIds.map(lookup.blockOf))
  const codeBlocks = blocksOf(stored.codeBlockIds)
  const rootBlocks = blocksOf(stored.rootBlockIds)
  const diffBlocks = blocksOf(stored.diffBlockIds)
  const renderRootBlocks = blocksOf(stored.renderRootBlockIds ?? [])
  const externalBlocks = blocksOf(stored.externalBlockIds)
  const externalSymbols = once(() => stored.externalSymbols.map((place) => symbolAt(place, lookup)))
  const exports = once(
    (): ReadonlyMap<string, CodeBlock | SourceRange> =>
      new Map(Object.entries(stored.exports).map(([name, exported]) => [name, typeof exported === "string" ? lookup.blockOf(exported) : exported] as const)),
  )
  return {
    filePath: stored.filePath,
    diffContains: stored.diffContains,
    get codeBlocks() {
      return codeBlocks()
    },
    get rootBlocks() {
      return rootBlocks()
    },
    get diffBlocks() {
      return diffBlocks()
    },
    get renderRootBlocks() {
      return stored.renderRootBlockIds === undefined ? undefined : renderRootBlocks()
    },
    get externalSymbols() {
      return externalSymbols()
    },
    get externalBlocks() {
      return externalBlocks()
    },
    get exports() {
      return exports()
    },
  }
}

export const linkCodeGroupGraph = (stored: StoredCodeGroupGraph): ASTCodeGroupGraph => {
  const lookup: GroupLookup = {
    blockOf: (blockId) => found(blockById(), blockId),
    graphOf: (filePath) => found(graphByPath(), filePath),
  }
  const blockById = once(() => new Map(stored.codeBlocks.map((block) => [block.id, linkBlock(block, lookup)] as const)))
  const graphByPath = once(() => new Map(stored.astGraphs.map((astGraph) => [astGraph.filePath, linkGraph(astGraph, lookup)] as const)))
  return {
    astGraphs: stored.astGraphs.map((astGraph) => lookup.graphOf(astGraph.filePath)),
    rootASTGraphs: stored.rootASTGraphFilePaths.map(lookup.graphOf),
    codeBlocks: stored.codeBlocks.map((block) => lookup.blockOf(block.id)),
    diffBlocks: stored.diffBlockIds.map(lookup.blockOf),
    diffContains: stored.diffContains,
    chainContains: stored.chainContains,
    diffChains: stored.diffChainIds.map(lookup.blockOf),
  }
}
