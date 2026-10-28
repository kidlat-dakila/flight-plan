import { compareRanges } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import { listLeavesReached } from "@/shared/leaves-reached"
import type { ASTCodeGroupGraph, BlockLabel, CodeBlock, CodeBlockType, ImportGraphGroup, TraceDiagram, TraceNode, TraceNodeEdge } from "@flightplan/configurations"
import { groupCardNodes, listCardAddedEdges, listCardLeftOutEdgeIds, listCardParents, listLeftOutNodeIds, type CardContext, type NodeGroup, type ParentIdById } from "./cards"
import { isComponentCardBlock, listComponentCardLabels } from "./component-card"
import { isFunctionCardBlock, listFunctionCardLabels } from "./function-card"
import { isHookCallBlock } from "./hook-calls"
import { listListedBlocks } from "./listed-blocks"
import { foldedValueOf, listNodeSteps, nodeBlockAround, nodeBlockOf } from "./node-blocks"

export interface TraceScope {
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
  readonly otherLineFilePaths: readonly string[]
  readonly lineFilePaths?: readonly string[]
}

export interface TraceSources {
  readonly group: ASTCodeGroupGraph
  readonly importGraphGroup: ImportGraphGroup
  readonly scope: TraceScope | null
}

interface Reach {
  readonly leadsToOwnChange: (block: CodeBlock) => boolean
  readonly leadsToSharedChange: (block: CodeBlock) => boolean
  readonly isInOwnChange: (block: CodeBlock) => boolean
  readonly isOnOtherLine: (block: CodeBlock) => boolean
  readonly isInOwnFile: (block: CodeBlock) => boolean
  readonly leadsOnlyToOtherLines: (block: CodeBlock) => boolean
}

interface Visit {
  readonly block: CodeBlock
  readonly isBelowOwnChange: boolean
}

interface Step {
  readonly from: CodeBlock
  readonly to: CodeBlock
}

interface Walk {
  readonly blocks: readonly CodeBlock[]
  readonly steps: readonly Step[]
}

interface ValueRead {
  readonly reader: CodeBlock
  readonly value: CodeBlock
}

type ReadsByValueId = ReadonlyMap<string, readonly ValueRead[]>

interface FoldedValueHold {
  readonly nodeId: string
  readonly block: CodeBlock
}

type ImporterCountByPath = ReadonlyMap<string, number>

const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const EDGE_ID_SEPARATOR = " -> "
const VISIT_KEY_SEPARATOR = "|"
const NO_STEPS: readonly Step[] = []

const filePathOf = (block: CodeBlock): string => block.astGraph.filePath

export const rootBlockOf = (block: CodeBlock): CodeBlock => (block.parentBlock === null ? block : rootBlockOf(block.parentBlock))

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const reachWithin = (group: ASTCodeGroupGraph, scope: TraceScope | null): Reach => {
  if (scope === null) {
    return {
      leadsToOwnChange: (block) => block.diffSources.length > 0,
      leadsToSharedChange: () => false,
      isInOwnChange: () => false,
      isOnOtherLine: () => false,
      isInOwnFile: () => true,
      leadsOnlyToOtherLines: () => false,
    }
  }
  const ownPaths = new Set(scope.filePaths)
  const sharedPaths = new Set(scope.sharedFilePaths)
  const otherLinePaths = new Set(scope.otherLineFilePaths)
  const ownChangedRootIds = new Set(group.diffBlocks.filter((block) => ownPaths.has(filePathOf(block))).map((block) => rootBlockOf(block).id))
  return {
    leadsToOwnChange: (block) => block.diffSources.some((source) => ownPaths.has(filePathOf(source))),
    leadsToSharedChange: (block) => block.diffSources.some((source) => sharedPaths.has(filePathOf(source))),
    isInOwnChange: (block) => ownChangedRootIds.has(rootBlockOf(block).id),
    isOnOtherLine: (block) => otherLinePaths.has(filePathOf(block)),
    isInOwnFile: (block) => ownPaths.has(filePathOf(block)),
    leadsOnlyToOtherLines: (block) =>
      block.diffSources.some((source) => otherLinePaths.has(filePathOf(source))) && !block.diffSources.some((source) => ownPaths.has(filePathOf(source))),
  }
}

const visitKeyOf = ({ block, isBelowOwnChange }: Visit): string => [block.id, String(isBelowOwnChange)].join(VISIT_KEY_SEPARATOR)

const listNextVisits = ({ block, isBelowOwnChange }: Visit, reach: Reach): Visit[] => {
  const isBelow = isBelowOwnChange || reach.isInOwnChange(block)
  return block.nextBlocks.flatMap((next) => {
    if (reach.leadsToOwnChange(next)) return [{ block: next, isBelowOwnChange: isBelow }]
    return isBelow && reach.leadsToSharedChange(next) ? [{ block: next, isBelowOwnChange: true }] : []
  })
}

const walkChains = (pending: readonly Visit[], reach: Reach, visited: readonly Visit[] = [], steps: readonly Step[] = NO_STEPS): Walk => {
  const visitedKeys = new Set(visited.map(visitKeyOf))
  const arriving = firstOfEach(pending.filter((visit) => !visitedKeys.has(visitKeyOf(visit))), visitKeyOf)
  if (arriving.length === 0) return { blocks: firstOfEach(visited.map((visit) => visit.block), (block) => block.id), steps }
  const taken = arriving.map((visit) => ({ visit, nextVisits: listNextVisits(visit, reach) }))
  const stepsTaken = taken.flatMap(({ visit, nextVisits }) => nextVisits.map((next) => ({ from: visit.block, to: next.block })))
  return walkChains(taken.flatMap(({ nextVisits }) => nextVisits), reach, [...visited, ...arriving], [...steps, ...stepsTaken])
}

const listIdsLeadingTo = (keptIds: ReadonlySet<string>, candidates: readonly CodeBlock[], steps: readonly Step[]): ReadonlySet<string> => {
  const joining = candidates.filter((block) => !keptIds.has(block.id) && steps.some((step) => step.from.id === block.id && keptIds.has(step.to.id)))
  return joining.length === 0 ? keptIds : listIdsLeadingTo(new Set([...keptIds, ...joining.map((block) => block.id)]), candidates, steps)
}

const withoutOtherLines = ({ blocks, steps }: Walk, reach: Reach): Walk => {
  const candidates = blocks.filter((block) => !reach.isOnOtherLine(block))
  const steppingIds = new Set(steps.map((step) => step.from.id))
  const endIds = new Set(candidates.filter((block) => isChanged(block) || !steppingIds.has(block.id)).map((block) => block.id))
  const keptIds = listIdsLeadingTo(endIds, candidates, steps)
  return { blocks: blocks.filter((block) => keptIds.has(block.id)), steps: steps.filter((step) => keptIds.has(step.from.id) && keptIds.has(step.to.id)) }
}

const compareBlocks = (one: CodeBlock, two: CodeBlock): number => compareRanges(one.lineOfCodeRangeReference[0], two.lineOfCodeRangeReference[0])

const listBlockLabels = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): BlockLabel[] => {
  if (isFunctionCardBlock(nodeBlock) || isHookCallBlock(nodeBlock)) return listFunctionCardLabels(nodeBlock, insideBlocks)
  if (isComponentCardBlock(nodeBlock)) return listComponentCardLabels(nodeBlock, insideBlocks)
  return listListedBlocks(nodeBlock, insideBlocks).map(({ block }) => ({ label: null, codeBlock: block }))
}

export const toTraceNode = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): TraceNode => {
  const inside = [...insideBlocks].sort(compareBlocks)
  const codeBlocks = [nodeBlock, ...inside]
  return {
    id: nodeBlock.id,
    type: nodeBlock.type,
    label: null,
    description: null,
    codeBlocks,
    diffCodeBlocks: codeBlocks.filter(isChanged),
    children: [],
    triggerLabels: inside.filter((block) => TRIGGER_TYPES.has(block.type)).map((codeBlock) => ({ label: null, codeBlock })),
    blockLabels: listBlockLabels(nodeBlock, inside),
    isRequired: false,
  }
}

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const handsOverOtherLines = (root: CodeBlock, reach: Reach): boolean => !reach.isInOwnFile(root) && listBlocksWithin(root).some(reach.leadsOnlyToOtherLines)

const listShownBlocks = (walkedBlocks: readonly CodeBlock[], group: ASTCodeGroupGraph, reach: Reach): CodeBlock[] => {
  const walkedRootIds = new Set(walkedBlocks.map((block) => rootBlockOf(block).id))
  const changedBlocks = group.diffBlocks.filter((block) => walkedRootIds.has(rootBlockOf(block).id) && !handsOverOtherLines(rootBlockOf(block), reach))
  return firstOfEach([...walkedBlocks, ...changedBlocks], (block) => block.id)
}

const listNodeBlocksDownTo = (block: CodeBlock): CodeBlock[] => {
  const nodeBlock = nodeBlockOf(block)
  if (nodeBlock === null) return []
  const around = nodeBlockAround(nodeBlock)
  return around === null ? [nodeBlock] : [...listNodeBlocksDownTo(around), nodeBlock]
}

const listNodeBlocks = (shownBlocks: readonly CodeBlock[]): CodeBlock[] => {
  const nodeBlocks = firstOfEach(shownBlocks.flatMap(listNodeBlocksDownTo), (block) => block.id)
  return [...nodeBlocks.filter((block) => block.parentBlock === null), ...nodeBlocks.filter((block) => block.parentBlock !== null)]
}

const readerOf = (block: CodeBlock): CodeBlock | null => nodeBlockOf(block) ?? foldedValueOf(block)

const listValueReads = (steps: readonly Step[]): ValueRead[] =>
  steps.flatMap(({ from, to }) => {
    const value = foldedValueOf(to)
    const reader = readerOf(from)
    return value === null || reader === null || reader.id === value.id ? [] : [{ reader, value }]
  })

const readersOf = (value: CodeBlock, readsByValueId: ReadsByValueId): readonly CodeBlock[] => (readsByValueId.get(value.id) ?? []).map(({ reader }) => reader)

const listNodesReading = (value: CodeBlock, readsByValueId: ReadsByValueId): CodeBlock[] =>
  listLeavesReached(value, { nextOf: (reader) => readersOf(reader, readsByValueId), isLeaf: (reader) => foldedValueOf(reader) === null, keyOf: (reader) => reader.id })

const listFoldedValueHolds = (steps: readonly Step[], shownBlocks: readonly CodeBlock[]): FoldedValueHold[] => {
  const reads = listValueReads(steps)
  const readsByValueId = groupBy(reads, (read) => read.value.id)
  const values = firstOfEach(reads.map((read) => read.value), (value) => value.id)
  return values.flatMap((value) => {
    const valueBlocks = shownBlocks.filter((block) => rootBlockOf(block).id === value.id)
    return listNodesReading(value, readsByValueId).flatMap((node) => valueBlocks.map((block) => ({ nodeId: node.id, block })))
  })
}

const listNodes = (nodeBlocks: readonly CodeBlock[], shownBlocks: readonly CodeBlock[], steps: readonly Step[]): TraceNode[] => {
  const heldBlocks = firstOfEach([...nodeBlocks, ...shownBlocks], (block) => block.id).filter((block) => block.parentBlock !== null)
  const heldByNodeId = groupBy(heldBlocks, (block) => nodeBlockAround(block)?.id ?? "")
  const foldedByNodeId = groupBy(listFoldedValueHolds(steps, shownBlocks), (hold) => hold.nodeId)
  const insideBlocksOf = (nodeBlock: CodeBlock): CodeBlock[] => [
    ...(heldByNodeId.get(nodeBlock.id) ?? []),
    ...(foldedByNodeId.get(nodeBlock.id) ?? []).map((hold) => hold.block),
  ]
  return nodeBlocks.map((nodeBlock) => toTraceNode(nodeBlock, insideBlocksOf(nodeBlock)))
}

const edgeIdOf = (from: string, to: string): string => [from, to].join(EDGE_ID_SEPARATOR)

const toBlockEdge = (from: CodeBlock, to: CodeBlock): TraceNodeEdge => ({ id: edgeIdOf(from.id, to.id), from: from.id, to: to.id })

const listStepEdges = ({ blocks, steps }: Walk): TraceNodeEdge[] => {
  const stepsByFromId = groupBy(steps, (step) => step.from.id)
  const nextBlocksOf = (block: CodeBlock): CodeBlock[] => (stepsByFromId.get(block.id) ?? []).map((step) => step.to)
  return listNodeSteps(blocks, nextBlocksOf).map(({ from, to }) => toBlockEdge(from, to))
}

const listHeldNodeEdges = (nodeBlocks: readonly CodeBlock[]): TraceNodeEdge[] =>
  nodeBlocks.flatMap((nodeBlock) => {
    const around = nodeBlockAround(nodeBlock)
    return around === null ? [] : [toBlockEdge(around, nodeBlock)]
  })

const listEdges = (walk: Walk, nodeBlocks: readonly CodeBlock[]): TraceNodeEdge[] =>
  firstOfEach([...listStepEdges(walk), ...listHeldNodeEdges(nodeBlocks)], (edge) => edge.id)

const listImporterPaths = (pendingPaths: readonly string[], importersOf: (filePath: string) => readonly string[], foundPaths: ReadonlySet<string> = new Set()): ReadonlySet<string> => {
  const arrivingPaths = [...new Set(pendingPaths)].filter((filePath) => !foundPaths.has(filePath))
  if (arrivingPaths.length === 0) return foundPaths
  return listImporterPaths(arrivingPaths.flatMap(importersOf), importersOf, new Set([...foundPaths, ...arrivingPaths]))
}

const countImportersByPath = (importGraphGroup: ImportGraphGroup, group: ASTCodeGroupGraph): ImporterCountByPath => {
  const groupPaths = new Set(group.astGraphs.map((astGraph) => astGraph.filePath))
  const importersByPath = new Map(importGraphGroup.map((file) => [file.filePath, file.importedBy.filter((importer) => groupPaths.has(importer))] as const))
  const importersOf = (filePath: string): readonly string[] => importersByPath.get(filePath) ?? []
  return new Map(importGraphGroup.map((file) => [file.filePath, listImporterPaths(importersOf(file.filePath), importersOf).size] as const))
}

const nestNodes = (nodes: readonly TraceNode[], parentIdById: ParentIdById): TraceNode[] => {
  const childrenByParentId = groupBy(nodes.filter((node) => parentIdById.has(node.id)), (node) => parentIdById.get(node.id) ?? "")
  const withChildren = (node: TraceNode): TraceNode => ({ ...node, children: (childrenByParentId.get(node.id) ?? []).map(withChildren) })
  return nodes.filter((node) => !parentIdById.has(node.id)).map(withChildren)
}

interface Grouped {
  readonly nodes: readonly TraceNode[]
  readonly edges: readonly TraceNodeEdge[]
}

const groupedIdOf = (id: string, groupIdByMemberId: ReadonlyMap<string, string>): string => groupIdByMemberId.get(id) ?? id

const withGroups = (nodes: readonly TraceNode[], edges: readonly TraceNodeEdge[], groups: readonly NodeGroup[]): Grouped => {
  const groupIdByMemberId = new Map(groups.flatMap(({ node, memberIds }) => memberIds.map((memberId) => [memberId, node.id] as const)))
  const groupsByPlaceId = groupBy(groups, (group) => group.placedAtId)
  const listed = nodes.flatMap((node) => [
    ...(groupsByPlaceId.get(node.id) ?? []).map((group) => group.node),
    ...(groupIdByMemberId.has(node.id) ? [] : [node]),
  ])
  const remapped = edges
    .map((edge) => toEdgeBetween(groupedIdOf(edge.from, groupIdByMemberId), groupedIdOf(edge.to, groupIdByMemberId)))
    .filter((edge) => edge.from !== edge.to)
  return { nodes: firstOfEach(listed, (node) => node.id), edges: firstOfEach(remapped, (edge) => edge.id) }
}

const toEdgeBetween = (from: string, to: string): TraceNodeEdge => ({ id: edgeIdOf(from, to), from, to })

const withCardEdges = (context: CardContext): TraceNodeEdge[] => {
  const leftOutIds = listCardLeftOutEdgeIds(context)
  return firstOfEach([...context.edges.filter((edge) => !leftOutIds.has(edge.id)), ...listCardAddedEdges(context)], (edge) => edge.id)
}

export const listTraceNodes = (nodes: readonly TraceNode[]): TraceNode[] => nodes.flatMap((node) => [node, ...listTraceNodes(node.children)])

export const generateTraceDiagram = ({ group, importGraphGroup, scope }: TraceSources): TraceDiagram | null => {
  const reach = reachWithin(group, scope)
  const linePaths = new Set(scope?.lineFilePaths ?? [])
  const leadsToLine = (block: CodeBlock): boolean => scope?.lineFilePaths === undefined || block.diffSources.some((source) => linePaths.has(filePathOf(source)))
  const ownTops = group.diffChains.filter(reach.leadsToOwnChange)
  const topsWithin = (topIds: ReadonlySet<string>): ReadonlySet<string> => {
    const walked = walkChains(ownTops.filter((block) => topIds.has(block.id)).map((block) => ({ block, isBelowOwnChange: false })), reach)
    const walkedRootIds = new Set(walked.blocks.map((block) => rootBlockOf(block).id))
    const joined = ownTops.filter((block) => !topIds.has(block.id) && walkedRootIds.has(rootBlockOf(block).id))
    return joined.length === 0 ? topIds : topsWithin(new Set([...topIds, ...joined.map((block) => block.id)]))
  }
  const topIds = topsWithin(new Set(ownTops.filter(leadsToLine).map((block) => block.id)))
  const tops = ownTops.filter((block) => topIds.has(block.id)).map((block) => ({ block, isBelowOwnChange: false }))
  const walk = withoutOtherLines(walkChains(tops, reach), reach)
  const shownBlocks = listShownBlocks(walk.blocks, group, reach)
  const nodeBlocks = listNodeBlocks(shownBlocks)
  if (nodeBlocks.length === 0) return null
  const allNodes = listNodes(nodeBlocks, shownBlocks, walk.steps)
  const allEdges = listEdges(walk, nodeBlocks)
  const importerCountByPath = countImportersByPath(importGraphGroup, group)
  const leftOutIds = listLeftOutNodeIds({ nodes: allNodes, edges: allEdges, importerCountByPath })
  const keptNodes = allNodes.filter((node) => !leftOutIds.has(node.id))
  const keptEdges = allEdges.filter((edge) => !leftOutIds.has(edge.from) && !leftOutIds.has(edge.to))
  const { nodes, edges } = withGroups(keptNodes, keptEdges, groupCardNodes(keptNodes))
  const traceNodeEdges = withCardEdges({ nodes, edges, importerCountByPath })
  if (traceNodeEdges.length === 0) return null
  const parentIdById = listCardParents({ nodes, edges: traceNodeEdges, importerCountByPath })
  return { astCodeGroup: group, importGraphGroup, title: null, description: null, traceNodes: nestNodes(nodes, parentIdById), traceNodeEdges, isRequired: false }
}
