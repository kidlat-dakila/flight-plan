import type {
  StoredASTGraph,
  StoredCodeBlock,
  StoredCodeBlockSymbol,
  StoredCodeGroupGraph,
  StoredExports,
  StoredSymbolPlace,
  StoredSymbolUsage,
} from "./stored-types"
import type { ASTCodeGroupGraph, ASTGraph, CodeBlock, CodeBlockSymbol } from "./types"

type PlaceBySymbol = ReadonlyMap<CodeBlockSymbol, StoredSymbolPlace>

const idsOf = (blocks: readonly CodeBlock[]): string[] => blocks.map((block) => block.id)

const usageOf = ({ usedAt, use, handedTo, member, binding, isRunInPlace }: CodeBlockSymbol): StoredSymbolUsage => ({
  usedAt,
  use,
  ...(handedTo === undefined ? {} : { handedToId: handedTo?.id ?? null }),
  ...(member === undefined ? {} : { member: { path: member.path, blockId: member.block?.id ?? null } }),
  ...(binding === undefined ? {} : { binding }),
  ...(isRunInPlace === true ? { isRunInPlace } : {}),
})

const storeSymbol = (symbol: CodeBlockSymbol): StoredCodeBlockSymbol => {
  const usage = usageOf(symbol)
  if (symbol.type === "internal-variable") return { ...usage, type: symbol.type, lineOfCodeReference: symbol.lineOfCodeReference }
  if (symbol.type === "external-variable") {
    return { ...usage, type: symbol.type, lineOfCodeReference: symbol.lineOfCodeReference, filePath: symbol.astGraph.filePath }
  }
  if (symbol.type === "unopened-import") {
    return { ...usage, type: symbol.type, specifier: symbol.specifier, importedName: symbol.importedName, isLibrary: symbol.isLibrary }
  }
  return { ...usage, type: symbol.type, codeBlockId: symbol.codeBlockReference.id }
}

const placesOf = (symbols: readonly CodeBlockSymbol[], placeBySymbol: PlaceBySymbol): StoredSymbolPlace[] =>
  symbols.flatMap((symbol) => {
    const place = placeBySymbol.get(symbol)
    return place === undefined ? [] : [place]
  })

const storeBlock = (block: CodeBlock, placeBySymbol: PlaceBySymbol): StoredCodeBlock => ({
  id: block.id,
  ...(block.name === undefined ? {} : { name: block.name }),
  type: block.type,
  ...(block.deletedType === undefined ? {} : { deletedType: block.deletedType }),
  lineOfCodeRangeReference: block.lineOfCodeRangeReference,
  parentBlockId: block.parentBlock?.id ?? null,
  childrenBlockIds: idsOf(block.childrenBlocks),
  isRoot: block.isRoot,
  isExported: block.isExported,
  ...(block.isPlain === true ? { isPlain: true } : {}),
  ...(block.isReturned === true ? { isReturned: true } : {}),
  ...(block.returnsAt === undefined ? {} : { returnsAt: block.returnsAt }),
  ...(block.isParameterProperty === true ? { isParameterProperty: true } : {}),
  ...(block.isAnnotatedAlias === true ? { isAnnotatedAlias: true } : {}),
  exportedByFilePaths: block.exportedBy.map((astGraph) => astGraph.filePath),
  lineOfCodeDiffs: block.lineOfCodeDiffs,
  diffs: block.diffs,
  diffSourceIds: idsOf(block.diffSources),
  classifications: block.classifications,
  diffClassifications: block.diffClassifications,
  outerSymbols: block.outerSymbols.map(storeSymbol),
  usedByIds: idsOf(block.usedBy),
  nextBlockIds: idsOf(block.nextBlocks),
  handedFrom: placesOf(block.handedFrom, placeBySymbol),
  filePath: block.astGraph.filePath,
  catalogue: block.catalogue,
  ...(block.card === undefined ? {} : { card: block.card }),
})

const storeExports = ({ exports }: ASTGraph): StoredExports =>
  Object.fromEntries([...exports].map(([name, exported]) => [name, "id" in exported ? exported.id : exported] as const))

const storeGraph = (astGraph: ASTGraph, placeBySymbol: PlaceBySymbol): StoredASTGraph => ({
  filePath: astGraph.filePath,
  codeBlockIds: idsOf(astGraph.codeBlocks),
  rootBlockIds: idsOf(astGraph.rootBlocks),
  diffBlockIds: idsOf(astGraph.diffBlocks),
  diffContains: astGraph.diffContains,
  ...(astGraph.renderRootBlocks === undefined ? {} : { renderRootBlockIds: idsOf(astGraph.renderRootBlocks) }),
  externalSymbols: placesOf(astGraph.externalSymbols, placeBySymbol),
  externalBlockIds: idsOf(astGraph.externalBlocks),
  exports: storeExports(astGraph),
})

export const storeCodeGroupGraph = (group: ASTCodeGroupGraph): StoredCodeGroupGraph => {
  const placeBySymbol: PlaceBySymbol = new Map(
    group.codeBlocks.flatMap((block) => block.outerSymbols.map((symbol, symbolIndex) => [symbol, { blockId: block.id, symbolIndex }] as const)),
  )
  return {
    astGraphs: group.astGraphs.map((astGraph) => storeGraph(astGraph, placeBySymbol)),
    rootASTGraphFilePaths: group.rootASTGraphs.map((astGraph) => astGraph.filePath),
    codeBlocks: group.codeBlocks.map((block) => storeBlock(block, placeBySymbol)),
    diffBlockIds: idsOf(group.diffBlocks),
    diffContains: group.diffContains,
    chainContains: group.chainContains,
    diffChainIds: idsOf(group.diffChains),
  }
}
