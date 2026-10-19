import { listBlocksUsing } from "@/code-blocks/segments"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { Blast, DiffType } from "@flightplan/configurations"

export interface BlastSources {
  readonly group: StoredCodeGroupGraph
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
  readonly diffTypes: ReadonlyMap<string, DiffType>
}

const EDGE_SEPARATOR = ">"

export const referencedIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

export const inOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => (one < two ? -1 : Number(one > two)))

const listUses = (using: readonly StoredCodeBlock[], drawnPaths: ReadonlySet<string>): Blast["edges"] => {
  const usingById = new Map(using.map((block) => [block.id, block] as const))
  const uses = using.flatMap((block) =>
    block.outerSymbols.flatMap((symbol) => {
      const used = usingById.get(referencedIdOf(symbol) ?? "")
      const isDrawn = used !== undefined && used.filePath !== block.filePath && drawnPaths.has(block.filePath) && drawnPaths.has(used.filePath)
      return isDrawn ? [{ importer: block.filePath, imported: used.filePath }] : []
    }),
  )
  const keys = [...new Set(uses.map(({ importer, imported }) => [importer, imported].join(EDGE_SEPARATOR)))]
  return keys.flatMap((key) => uses.filter(({ importer, imported }) => [importer, imported].join(EDGE_SEPARATOR) === key).slice(0, 1))
}

export const generateBlastFromBlocks = ({ group, filePaths, sharedFilePaths, diffTypes }: BlastSources): Blast => {
  const using = listBlocksUsing(group, filePaths, sharedFilePaths)
  const reachedPaths = inOrder([...new Set(using.map((block) => block.filePath))].filter((filePath) => !filePaths.includes(filePath)))
  const drawnPaths = [...inOrder(filePaths), ...reachedPaths]
  return {
    nodes: drawnPaths.map((path) => ({ path, diffType: diffTypes.get(path) ?? null, impactType: null, impactReason: null, isRequired: false })),
    edges: listUses(using, new Set(drawnPaths)),
  }
}
