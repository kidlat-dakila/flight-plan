import type { FileSyntax } from "@/ast-graph/types"
import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import type { FindExportedBinding } from "@/catalogue/matching/syntax-reader"
import { groupBy } from "@/shared/group-by"
import { once } from "@/shared/memo"
import { traceAffectedDiffs } from "./affected-diffs"
import { traceChains, type TracedChains } from "./chains"
import { listDeletedCode, listRemovedDecorations, type DeletedCode, type PatchDiff } from "./deleted-blocks"
import { placeDiffs, type PlacedDiff } from "./diff-blocks"
import { hasRunningChange, readChainContains, readDiffContains } from "./diff-contains"
import { createExportTable } from "./export-table"
import { grammarOfFile, outlineFile, type LanguageSource } from "./languages"
import { linkReferences } from "./link-references"
import type { FileReading } from "./reading"
import { compareRanges } from "./source-range"
import type { StoredASTGraph, StoredCodeBlock, StoredCodeGroupGraph } from "./stored-types"
import { followMembers } from "./value-origins"

export interface CodeFileSource extends LanguageSource {
  readonly importedBy: readonly string[]
  readonly diffs: readonly PatchDiff[]
}

const listDeletedOf = (file: CodeFileSource, blocksByPath: ReadonlyMap<string, readonly StoredCodeBlock[]>): DeletedCode[] =>
  listDeletedCode(file.filePath, grammarOfFile(file.filePath), blocksByPath.get(file.filePath) ?? [], file.diffs)

const placeDiffsOf = (file: CodeFileSource, blocksByPath: ReadonlyMap<string, readonly StoredCodeBlock[]>, deleted: readonly DeletedCode[]): PlacedDiff[] => {
  const blocks = blocksByPath.get(file.filePath) ?? []
  const decorations = listRemovedDecorations(grammarOfFile(file.filePath), blocks, file.diffs)
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

const withDiffBlocks = (astGraph: StoredASTGraph, changedBlocks: readonly StoredCodeBlock[]): StoredASTGraph => {
  const ownBlocks = changedBlocks.filter((block) => block.filePath === astGraph.filePath)
  return {
    ...astGraph,
    diffBlockIds: ownBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id),
    diffContains: readDiffContains(ownBlocks),
  }
}

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
  const readings = outlined.map((file) => file.read(exports.findExport, findBinding))
  const readBlocks = readings.flatMap(({ blocks }) => blocks)
  const returnedIds = new Set(readBlocks.filter((block) => block.isReturned === true).map((block) => block.id))
  const heldMarkupIds = new Set(readBlocks.filter((block) => block.holdsMarkup === true).map((block) => block.id))
  const linked = linkReferences(readings, exports)
  const linkedBlocks = followMembers(linked.codeBlocks, linked.details, BUILT_IN_LIBRARIES)
  const blocksByPath = groupBy(linkedBlocks, (block) => block.filePath)
  const deleted = files.flatMap((file) => listDeletedOf(file, blocksByPath))
  const deletedByHolder = groupBy(deleted, (one) => one.block.parentBlockId)
  const placedByBlock = groupBy(files.flatMap((file) => placeDiffsOf(file, blocksByPath, deleted)), (placed) => placed.blockId)
  const changedBlocks = [...linkedBlocks.map((block) => withDeletedInside(withDiffs(block, placedByBlock), deletedByHolder)), ...deleted.map((one) => one.block)]
  const diffBlockIds = changedBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id)
  const diffContains = readDiffContains(changedBlocks)
  const chains = hasRunningChange(diffContains) ? traceChains(changedBlocks, { returnedIds, heldMarkupIds }) : NO_CHAINS
  const rootASTGraphFilePaths = listRootFilePaths(files)
  const codeBlocks = traceAffectedDiffs(files, rootASTGraphFilePaths, changedBlocks).map((block) => withChains(block, chains))
  const group: StoredCodeGroupGraph = {
    astGraphs: linked.astGraphs.map((astGraph) => withDiffBlocks(withDeletedBlocks(astGraph, deleted), changedBlocks)),
    rootASTGraphFilePaths,
    codeBlocks,
    diffBlockIds,
    diffContains,
    chainContains: readChainContains(codeBlocks),
    diffChainIds: chains.diffChainIds,
  }
  return { group, readSyntaxByPath: once(() => new Map(readings.flatMap(listSyntaxOf))) }
}

export const buildStoredCodeGroupGraph = (files: readonly CodeFileSource[]): StoredCodeGroupGraph => readCodeGroup(files).group
