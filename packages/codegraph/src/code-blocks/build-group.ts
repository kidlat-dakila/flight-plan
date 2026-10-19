import type { FileSyntax } from "@/ast-graph/types"
import type { FindExportedBinding, FindHandedExport } from "@/catalogue/matching/syntax-reader"
import { LIBRARIES } from "@/code-blocks/libraries"
import { groupBy } from "@/shared/group-by"
import { once } from "@/shared/memo"
import { traceAffectedDiffs } from "./affected-diffs"
import { linkCards } from "./card-links"
import { traceChains, type TracedChains } from "./chains"
import { classifyGroup, withClassifications, type GroupSignals } from "./classifications"
import { listDeletedCode, listRemovedDecorations, type DeletedCode, type PatchDiff } from "./deleted-blocks"
import { placeDiffs, type PlacedDiff } from "./diff-blocks"
import { hasRunningChange, readChainContains, readDiffContains, type OwnClassificationsOf } from "./diff-contains"
import { createExportTable } from "./export-table"
import { grammarOfSource, outlineFile, type LanguageSource } from "./languages"
import { linkReferences } from "./link-references"
import type { FileReading } from "./reading"
import { mountRoutes } from "./route-mounts"
import { compareRanges } from "./source-range"
import type { StoredASTGraph, StoredCodeBlock, StoredCodeGroupGraph } from "./stored-types"
import type { CodeBlockClassification } from "./types"
import { followMembers } from "./value-origins"

export interface CodeFileSource extends LanguageSource {
  readonly importedBy: readonly string[]
  readonly diffs: readonly PatchDiff[]
  readonly placedClassifications?: readonly CodeBlockClassification[]
}

const listDeletedOf = (file: CodeFileSource, blocksByPath: ReadonlyMap<string, readonly StoredCodeBlock[]>): DeletedCode[] =>
  listDeletedCode(file.filePath, grammarOfSource(file), blocksByPath.get(file.filePath) ?? [], file.diffs)

const placeDiffsOf = (file: CodeFileSource, blocksByPath: ReadonlyMap<string, readonly StoredCodeBlock[]>, deleted: readonly DeletedCode[]): PlacedDiff[] => {
  const blocks = blocksByPath.get(file.filePath) ?? []
  const decorations = listRemovedDecorations(grammarOfSource(file), blocks, file.diffs)
  const held = new Set<PatchDiff>([...deleted.map((one) => one.diff), ...decorations.map((one) => one.diff)])
  return [
    ...decorations.map(({ blockId, diff }) => ({ blockId, diff: { type: diff.type, range: diff.range } })),
    ...placeDiffs(blocks, file.diffs.filter((diff) => !held.has(diff))),
  ]
}

const withDeletedInside = (block: StoredCodeBlock, deletedByHolder: ReadonlyMap<string | null, readonly DeletedCode[]>): StoredCodeBlock => {
  const inside = deletedByHolder.get(block.id)
  return inside === undefined ? block : { ...block, childrenBlockIds: [...block.childrenBlockIds, ...inside.map((one) => one.block.id)] }
}

const withDeletedBlocks = (astGraph: StoredASTGraph, deleted: readonly DeletedCode[]): StoredASTGraph => {
  const own = deleted.map((one) => one.block).filter((block) => block.filePath === astGraph.filePath)
  if (own.length === 0) return astGraph
  return {
    ...astGraph,
    codeBlockIds: [...astGraph.codeBlockIds, ...own.map((block) => block.id)],
    rootBlockIds: [...astGraph.rootBlockIds, ...own.filter((block) => block.isRoot).map((block) => block.id)],
  }
}

const withDiffs = (block: StoredCodeBlock, placedByBlock: ReadonlyMap<string, readonly PlacedDiff[]>): StoredCodeBlock => {
  const placed = placedByBlock.get(block.id)
  if (placed === undefined) return block
  const diffs = placed.map((one) => one.diff).sort((one, two) => compareRanges(one.range, two.range))
  return { ...block, lineOfCodeDiffs: diffs.map((diff) => diff.range), diffs }
}

const NO_CHAINS: TracedChains = { nextBlockIdsById: new Map(), diffSourceIdsById: new Map(), diffChainIds: [] }

const withChains = (block: StoredCodeBlock, { nextBlockIdsById, diffSourceIdsById }: TracedChains): StoredCodeBlock => ({
  ...block,
  nextBlockIds: nextBlockIdsById.get(block.id) ?? [],
  diffSourceIds: diffSourceIdsById.get(block.id) ?? [],
})

const withDiffBlocks = (astGraph: StoredASTGraph, changedBlocks: readonly StoredCodeBlock[], ownClassificationsOf: OwnClassificationsOf): StoredASTGraph => {
  const ownBlocks = changedBlocks.filter((block) => block.filePath === astGraph.filePath)
  return {
    ...astGraph,
    diffBlockIds: ownBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id),
    diffContains: readDiffContains(ownBlocks, ownClassificationsOf),
  }
}

const NO_CLASSIFICATIONS: readonly CodeBlockClassification[] = []

const signalsOf = (files: readonly CodeFileSource[], readings: readonly FileReading[]): GroupSignals => ({
  libraryUsesByPath: new Map(readings.map((reading) => [reading.filePath, reading.libraryUses] as const)),
  placedByPath: new Map(files.map((file) => [file.filePath, file.placedClassifications ?? NO_CLASSIFICATIONS] as const)),
  libraries: LIBRARIES,
})

const listRootFilePaths = (files: readonly CodeFileSource[]): string[] => {
  const filePaths = new Set(files.map((file) => file.filePath))
  return files.filter((file) => file.importedBy.every((importer) => !filePaths.has(importer))).map((file) => file.filePath)
}

export interface ReadCodeGroup {
  readonly group: StoredCodeGroupGraph
  readonly readSyntaxByPath: () => ReadonlyMap<string, FileSyntax>
}

const listSyntaxOf = ({ filePath, readSyntax }: FileReading): (readonly [string, FileSyntax])[] => (readSyntax === null ? [] : [[filePath, readSyntax()]])

export const readCodeGroup = (files: readonly CodeFileSource[]): ReadCodeGroup => {
  const outlined = files.map(outlineFile)
  const exports = createExportTable(outlined)
  const outlinedByPath = new Map(outlined.map((file) => [file.filePath, file] as const))
  const findBinding: FindExportedBinding = (filePath, exportedName) => {
    const found = exports.findExport(filePath, exportedName)
    return found === null ? null : (outlinedByPath.get(found.filePath)?.bindingAt?.(found.declarationRange, findBinding) ?? null)
  }
  const findHanded: FindHandedExport = (filePath, moduleNames) => {
    const handings = outlined.filter((file) => file.filePath !== filePath).flatMap((file) => file.handingsOf?.(filePath, moduleNames, findBinding, findHanded) ?? [])
    return handings.length === 0 ? null : handings[0]
  }
  const readings = outlined.map((file) => file.read(exports.findExport, findBinding, findHanded))
  const readBlocks = readings.flatMap(({ blocks }) => blocks)
  const returnedIds = new Set(readBlocks.filter((block) => block.isReturned === true).map((block) => block.id))
  const heldMarkupIds = new Set(readBlocks.filter((block) => block.holdsMarkup === true).map((block) => block.id))
  const linked = linkReferences(readings, exports)
  const linkedBlocks = mountRoutes(linkCards(followMembers(linked.codeBlocks, linked.details, LIBRARIES)))
  const blocksByPath = groupBy(linkedBlocks, (block) => block.filePath)
  const deleted = files.flatMap((file) => listDeletedOf(file, blocksByPath))
  const deletedByHolder = groupBy(deleted, (one) => one.block.parentBlockId)
  const placedByBlock = groupBy(files.flatMap((file) => placeDiffsOf(file, blocksByPath, deleted)), (placed) => placed.blockId)
  const changedBlocks = [...linkedBlocks.map((block) => withDeletedInside(withDiffs(block, placedByBlock), deletedByHolder)), ...deleted.map((one) => one.block)]
  const diffBlockIds = changedBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id)
  const classified = classifyGroup(changedBlocks, signalsOf(files, readings))
  const ownClassificationsOf: OwnClassificationsOf = (block) => classified.ownById.get(block.id) ?? NO_CLASSIFICATIONS
  const diffContains = readDiffContains(changedBlocks, ownClassificationsOf)
  const chains = hasRunningChange(diffContains) ? traceChains(changedBlocks, { returnedIds, heldMarkupIds }) : NO_CHAINS
  const rootASTGraphFilePaths = listRootFilePaths(files)
  const codeBlocks = traceAffectedDiffs(files, rootASTGraphFilePaths, changedBlocks).map((block) => withClassifications(withChains(block, chains), classified))
  const group: StoredCodeGroupGraph = {
    astGraphs: linked.astGraphs.map((astGraph) => withDiffBlocks(withDeletedBlocks(astGraph, deleted), changedBlocks, ownClassificationsOf)),
    rootASTGraphFilePaths,
    codeBlocks,
    diffBlockIds,
    diffContains,
    chainContains: readChainContains(codeBlocks, ownClassificationsOf),
    diffChainIds: chains.diffChainIds,
  }
  return { group, readSyntaxByPath: once(() => new Map(readings.flatMap(listSyntaxOf))) }
}

export const buildStoredCodeGroupGraph = (files: readonly CodeFileSource[]): StoredCodeGroupGraph => readCodeGroup(files).group
