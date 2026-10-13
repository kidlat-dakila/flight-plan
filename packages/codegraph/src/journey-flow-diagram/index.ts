import { compareRanges } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { ASTCodeGroupGraph, CodeBlock, CodeBlockType, ImportGraphGroup, JourneyFlowDiagram, JourneyNode, JourneyNodeEdge } from "@flightplan/configurations"
import { listListedBlocks } from "./listed-blocks"
import { listNodeSteps, nodeBlockAround, nodeBlockOf } from "./node-blocks"

export interface JourneyScope {
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
  readonly otherLineFilePaths: readonly string[]
}

export interface JourneySources {
  readonly group: ASTCodeGroupGraph
  readonly importGraphGroup: ImportGraphGroup
  readonly scope: JourneyScope | null
}

interface Reach {
  readonly leadsToOwnChange: (block: CodeBlock) => boolean
  readonly leadsToSharedChange: (block: CodeBlock) => boolean
  readonly isInOwnChange: (block: CodeBlock) => boolean
  readonly isOnOtherLine: (block: CodeBlock) => boolean
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

type ParentIdById = ReadonlyMap<string, string>

const COMPONENT: CodeBlockType = "component"
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const EDGE_ID_SEPARATOR = " -> "
const VISIT_KEY_SEPARATOR = "|"
const NO_STEPS: readonly Step[] = []
const NO_PARENTS: ParentIdById = new Map()

const filePathOf = (block: CodeBlock): string => block.astGraph.filePath

export const rootBlockOf = (block: CodeBlock): CodeBlock => (block.parentBlock === null ? block : rootBlockOf(block.parentBlock))

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const reachWithin = (group: ASTCodeGroupGraph, scope: JourneyScope | null): Reach => {
  if (scope === null) {
    return { leadsToOwnChange: (block) => block.diffSources.length > 0, leadsToSharedChange: () => false, isInOwnChange: () => false, isOnOtherLine: () => false }
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

export const toJourneyNode = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): JourneyNode => {
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
    blockLabels: listListedBlocks(nodeBlock, inside).map(({ block }) => ({ label: null, codeBlock: block })),
  }
}

const listShownBlocks = (walkedBlocks: readonly CodeBlock[], group: ASTCodeGroupGraph): CodeBlock[] => {
  const walkedRootIds = new Set(walkedBlocks.map((block) => rootBlockOf(block).id))
  const changedBlocks = group.diffBlocks.filter((block) => walkedRootIds.has(rootBlockOf(block).id))
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

const listNodes = (nodeBlocks: readonly CodeBlock[], shownBlocks: readonly CodeBlock[]): JourneyNode[] => {
  const heldBlocks = firstOfEach([...nodeBlocks, ...shownBlocks], (block) => block.id).filter((block) => block.parentBlock !== null)
  const heldByNodeId = groupBy(heldBlocks, (block) => nodeBlockAround(block)?.id ?? "")
  return nodeBlocks.map((nodeBlock) => toJourneyNode(nodeBlock, heldByNodeId.get(nodeBlock.id) ?? []))
}

const edgeIdOf = (from: string, to: string): string => [from, to].join(EDGE_ID_SEPARATOR)

const toEdge = (from: CodeBlock, to: CodeBlock): JourneyNodeEdge => ({ id: edgeIdOf(from.id, to.id), from: from.id, to: to.id })

const listStepEdges = ({ blocks, steps }: Walk): JourneyNodeEdge[] => {
  const stepsByFromId = groupBy(steps, (step) => step.from.id)
  const nextBlocksOf = (block: CodeBlock): CodeBlock[] => (stepsByFromId.get(block.id) ?? []).map((step) => step.to)
  return listNodeSteps(blocks, nextBlocksOf).map(({ from, to }) => toEdge(from, to))
}

const listHeldNodeEdges = (nodeBlocks: readonly CodeBlock[]): JourneyNodeEdge[] =>
  nodeBlocks.flatMap((nodeBlock) => {
    const around = nodeBlockAround(nodeBlock)
    return around === null ? [] : [toEdge(around, nodeBlock)]
  })

const listEdges = (walk: Walk, nodeBlocks: readonly CodeBlock[]): JourneyNodeEdge[] =>
  firstOfEach([...listStepEdges(walk), ...listHeldNodeEdges(nodeBlocks)], (edge) => edge.id)

const listHighestFilePaths = (importGraphGroup: ImportGraphGroup, group: ASTCodeGroupGraph): ReadonlySet<string> => {
  const groupPaths = new Set(group.astGraphs.map((astGraph) => astGraph.filePath))
  const isImportedInGroup = (importers: readonly string[]): boolean => importers.some((importer) => groupPaths.has(importer))
  return new Set(importGraphGroup.filter((file) => !isImportedInGroup(file.importedBy)).map((file) => file.filePath))
}

const reachChildren = (frontierIds: readonly string[], childIdsOf: (parentId: string) => readonly string[], parentIdById: ParentIdById, reachedIds: ReadonlySet<string>): ParentIdById => {
  if (frontierIds.length === 0) return parentIdById
  const found = firstOfEach(
    frontierIds.flatMap((parentId) => childIdsOf(parentId).filter((childId) => !reachedIds.has(childId)).map((childId) => [childId, parentId] as const)),
    ([childId]) => childId,
  )
  const foundIds = found.map(([childId]) => childId)
  return reachChildren(foundIds, childIdsOf, new Map([...parentIdById, ...found]), new Set([...reachedIds, ...foundIds]))
}

const assignParents = (componentIds: readonly string[], topIds: readonly string[], childIdsOf: (parentId: string) => readonly string[]): ParentIdById => {
  const parentIdById = reachChildren(topIds, childIdsOf, NO_PARENTS, new Set(topIds))
  const unreachedId = componentIds.find((componentId) => !topIds.includes(componentId) && !parentIdById.has(componentId))
  return unreachedId === undefined ? parentIdById : assignParents(componentIds, [...topIds, unreachedId], childIdsOf)
}

const listComponentParents = (nodes: readonly JourneyNode[], edges: readonly JourneyNodeEdge[], highestFilePaths: ReadonlySet<string>): ParentIdById => {
  const components = nodes.filter((node) => node.type === COMPONENT)
  const componentIds = new Set(components.map((node) => node.id))
  const renders = edges.filter((edge) => componentIds.has(edge.from) && componentIds.has(edge.to))
  const renderedIds = new Set(renders.map((edge) => edge.to))
  const unrendered = components.filter((node) => !renderedIds.has(node.id))
  const isHighest = (node: JourneyNode): boolean => highestFilePaths.has(filePathOf(node.codeBlocks[0]))
  const topIds = [...unrendered.filter(isHighest), ...unrendered.filter((node) => !isHighest(node))].map((node) => node.id)
  const childIdsOf = (parentId: string): string[] => renders.filter((edge) => edge.from === parentId).map((edge) => edge.to)
  return assignParents(components.map((node) => node.id), topIds, childIdsOf)
}

const nestNodes = (nodes: readonly JourneyNode[], parentIdById: ParentIdById): JourneyNode[] => {
  const childrenByParentId = groupBy(nodes.filter((node) => parentIdById.has(node.id)), (node) => parentIdById.get(node.id) ?? "")
  const withChildren = (node: JourneyNode): JourneyNode => ({ ...node, children: (childrenByParentId.get(node.id) ?? []).map(withChildren) })
  return nodes.filter((node) => !parentIdById.has(node.id)).map(withChildren)
}

export const listJourneyNodes = (nodes: readonly JourneyNode[]): JourneyNode[] => nodes.flatMap((node) => [node, ...listJourneyNodes(node.children)])

export const generateJourneyFlowDiagram = ({ group, importGraphGroup, scope }: JourneySources): JourneyFlowDiagram | null => {
  const reach = reachWithin(group, scope)
  const tops = group.diffChains.filter(reach.leadsToOwnChange).map((block) => ({ block, isBelowOwnChange: false }))
  const walk = withoutOtherLines(walkChains(tops, reach), reach)
  const shownBlocks = listShownBlocks(walk.blocks, group)
  const nodeBlocks = listNodeBlocks(shownBlocks)
  if (nodeBlocks.length === 0) return null
  const nodes = listNodes(nodeBlocks, shownBlocks)
  const journeyNodeEdges = listEdges(walk, nodeBlocks)
  const parentIdById = listComponentParents(nodes, journeyNodeEdges, listHighestFilePaths(importGraphGroup, group))
  return { astCodeGroup: group, importGraphGroup, journeyNodes: nestNodes(nodes, parentIdById), journeyNodeEdges }
}
