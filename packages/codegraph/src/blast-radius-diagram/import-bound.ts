import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { BlastEdge, DiffType, ImportBound } from "@flightplan/configurations"
import { inOrder, referencedIdOf } from "./from-blocks"

export interface ImportBoundSources {
  readonly group: StoredCodeGroupGraph
  readonly filePaths: readonly string[]
  readonly diffTypes: ReadonlyMap<string, DiffType>
}

type BlockById = ReadonlyMap<string, StoredCodeBlock>

const EDGE_SEPARATOR = ">"

const rootOf = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? block : rootOf(parent, blockById)
}

const withDescendants = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] => [
  block,
  ...block.childrenBlockIds.flatMap((childId) => {
    const child = blockById.get(childId)
    return child === undefined ? [] : withDescendants(child, blockById)
  }),
]

const withoutRepeats = (blocks: readonly StoredCodeBlock[]): StoredCodeBlock[] =>
  [...new Map(blocks.map((block) => [block.id, block] as const)).values()]

const listUsedRoots = (root: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] =>
  withoutRepeats(
    withDescendants(root, blockById)
      .flatMap((block) => block.outerSymbols)
      .flatMap((symbol) => {
        const used = blockById.get(referencedIdOf(symbol) ?? "")
        return used === undefined ? [] : [rootOf(used, blockById)]
      })
      .filter((usedRoot) => usedRoot.id !== root.id),
  )

const reachUsedRoots = (pending: readonly StoredCodeBlock[], blockById: BlockById, reached: readonly StoredCodeBlock[]): StoredCodeBlock[] => {
  const fresh = withoutRepeats(pending).filter((root) => reached.every((held) => held.id !== root.id))
  if (fresh.length === 0) return [...reached]
  return reachUsedRoots(fresh.flatMap((root) => listUsedRoots(root, blockById)), blockById, [...reached, ...fresh])
}

const listUses = (roots: readonly StoredCodeBlock[], blockById: BlockById): BlastEdge[] => {
  const uses = roots.flatMap((root) =>
    listUsedRoots(root, blockById)
      .filter((usedRoot) => usedRoot.filePath !== root.filePath)
      .map((usedRoot) => ({ importer: root.filePath, imported: usedRoot.filePath })))
  const useByKey = new Map(uses.map((use) => [[use.importer, use.imported].join(EDGE_SEPARATOR), use] as const))
  return inOrder([...useByKey.keys()]).flatMap((key) => {
    const use = useByKey.get(key)
    return use === undefined ? [] : [use]
  })
}

export const generateImportBound = ({ group, filePaths, diffTypes }: ImportBoundSources): ImportBound => {
  const blockById = new Map(group.codeBlocks.map((block) => [block.id, block] as const))
  const changedRoots = group.codeBlocks
    .filter((block) => block.lineOfCodeDiffs !== null && filePaths.includes(block.filePath))
    .map((block) => rootOf(block, blockById))
  const roots = reachUsedRoots(changedRoots, blockById, [])
  const usedPaths = inOrder([...new Set(roots.map((root) => root.filePath))].filter((filePath) => !filePaths.includes(filePath)))
  return {
    nodes: [...inOrder(filePaths), ...usedPaths].map((path) => ({ path, diffType: diffTypes.get(path) ?? null })),
    edges: listUses(roots, blockById),
  }
}
