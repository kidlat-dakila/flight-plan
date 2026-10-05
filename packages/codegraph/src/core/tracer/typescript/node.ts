export interface Node { type: string, start: number, end: number, [field: string]: unknown }

export const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"

export const nodesIn = (value: unknown): Node[] => {
  if (Array.isArray(value)) return value.filter(isNode)
  return isNode(value) ? [value] : []
}

export const childAt = (node: Node, field: string): Node | null => {
  const value = node[field]
  return isNode(value) ? value : null
}

export const childrenAt = (node: Node, field: string): Node[] => {
  const value = node[field]
  return Array.isArray(value) ? value.filter(isNode) : []
}

export const slotsAt = (node: Node, field: string): (Node | null)[] => {
  const value = node[field]
  return Array.isArray(value) ? value.map((one: unknown) => (isNode(one) ? one : null)) : []
}

export const textAt = (node: Node, field: string): string | null => {
  const value = node[field]
  return typeof value === "string" ? value : null
}

export const without = (node: Node, field: string): Node => ({
  ...Object.fromEntries(Object.entries(node).filter(([key]) => key !== field)),
  type: node.type,
  start: node.start,
  end: node.end,
})

export const renamed = (node: Node, from: string, to: string): Node =>
  node[from] === undefined ? node : { ...without(node, from), [to]: node[from] }
