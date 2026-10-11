import type { FileSyntax } from "@/ast-graph/types"
import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import type { FindExportedBinding } from "@/catalogue/matching/syntax-reader"
import { groupBy } from "@/shared/group-by"
import { once } from "@/shared/memo"
import { traceChains, type TracedChains } from "./chains"
import { placeDiffRanges, type PlacedDiff } from "./diff-blocks"
import { hasRunningChange, readChainContains, readDiffContains } from "./diff-contains"
import { createExportTable } from "./export-table"
import { outlineFile, type LanguageSource } from "./languages"
import { linkReferences } from "./link-references"
import type { FileReading } from "./reading"
import { compareRanges } from "./source-range"
import type { StoredASTGraph, StoredCodeBlock, StoredCodeGroupGraph } from "./stored-types"
import type { SourceRange } from "./types"
import { followMembers } from "./value-origins"

export interface CodeFileSource extends LanguageSource {
  readonly importedBy: readonly string[]
  readonly diffRanges: readonly SourceRange[]
}

const placeDiffsOf = (file: CodeFileSource, blocksByPath: ReadonlyMap<string, readonly StoredCodeBlock[]>): PlacedDiff[] =>
  placeDiffRanges(blocksByPath.get(file.filePath) ?? [], file.diffRanges)

const withDiffs = (block: StoredCodeBlock, placedByBlock: ReadonlyMap<string, readonly PlacedDiff[]>): StoredCodeBlock => {
  const placed = placedByBlock.get(block.id)
  return placed === undefined ? block : { ...block, lineOfCodeDiffs: placed.map((one) => one.range).sort(compareRanges) }
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
  const placedByBlock = groupBy(files.flatMap((file) => placeDiffsOf(file, blocksByPath)), (placed) => placed.blockId)
  const changedBlocks = linkedBlocks.map((block) => withDiffs(block, placedByBlock))
  const diffBlockIds = changedBlocks.filter((block) => block.lineOfCodeDiffs !== null).map((block) => block.id)
  const diffContains = readDiffContains(changedBlocks)
  const chains = hasRunningChange(diffContains) ? traceChains(changedBlocks, { returnedIds, heldMarkupIds }) : NO_CHAINS
  const codeBlocks = changedBlocks.map((block) => withChains(block, chains))
  const group: StoredCodeGroupGraph = {
    astGraphs: linked.astGraphs.map((astGraph) => withDiffBlocks(astGraph, changedBlocks)),
    rootASTGraphFilePaths: listRootFilePaths(files),
    codeBlocks,
    diffBlockIds,
    diffContains,
    chainContains: readChainContains(codeBlocks),
    diffChainIds: chains.diffChainIds,
  }
  return { group, readSyntaxByPath: once(() => new Map(readings.flatMap(listSyntaxOf))) }
}

export const buildStoredCodeGroupGraph = (files: readonly CodeFileSource[]): StoredCodeGroupGraph => readCodeGroup(files).group
