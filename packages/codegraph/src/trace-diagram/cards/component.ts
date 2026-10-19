import { firstOfEach } from "@/shared/first-of-each"
import type { CodeBlockType } from "@flightplan/configurations"
import { filePathOfNode, isNoNodeBlock, NO_PARENTS, SAME_NODES } from "./nodes"
import type { CardContext, CardRules, ParentIdById } from "./types"

const COMPONENT: CodeBlockType = "component"

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

const listComponentParents = ({ nodes, edges, importerCountByPath }: CardContext): ParentIdById => {
  const importerCountOf = (index: number): number => importerCountByPath.get(filePathOfNode(nodes[index])) ?? 0
  const components = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === COMPONENT)
    .sort((one, two) => importerCountOf(one.index) - importerCountOf(two.index) || one.index - two.index)
    .map(({ node }) => node)
  const componentIds = new Set(components.map((node) => node.id))
  const renders = edges.filter((edge) => componentIds.has(edge.from) && componentIds.has(edge.to))
  const renderedIds = new Set(renders.map((edge) => edge.to))
  const topIds = components.filter((node) => !renderedIds.has(node.id)).map((node) => node.id)
  const childIdsOf = (parentId: string): string[] => renders.filter((edge) => edge.from === parentId).map((edge) => edge.to)
  return assignParents(components.map((node) => node.id), topIds, childIdsOf)
}

export const componentCard: CardRules = {
  ...SAME_NODES,
  kind: "component",
  isNodeBlock: isNoNodeBlock,
  listParents: listComponentParents,
}
