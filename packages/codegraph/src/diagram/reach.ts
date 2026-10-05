export interface GraphEdge {
  readonly from: string
  readonly to: string
}

const neighboursOf = (edges: readonly GraphEdge[], id: string, isDirected: boolean): string[] =>
  edges.flatMap((edge) => {
    if (edge.to === id) return [edge.from]
    return !isDirected && edge.from === id ? [edge.to] : []
  })

const expandLevels = (
  edges: readonly GraphEdge[],
  frontier: readonly string[],
  levels: ReadonlyMap<string, number>,
  level: number,
  isDirected: boolean,
): ReadonlyMap<string, number> => {
  const next = [...new Set(frontier.flatMap((id) => neighboursOf(edges, id, isDirected)))].filter((id) => !levels.has(id))
  return next.length === 0
    ? levels
    : expandLevels(edges, next, new Map([...levels, ...next.map((id) => [id, level] as const)]), level + 1, isDirected)
}

const levelsFrom = (edges: readonly GraphEdge[], starts: readonly string[], isDirected: boolean): ReadonlyMap<string, number> =>
  expandLevels(edges, starts, new Map(starts.map((id) => [id, 0] as const)), 1, isDirected)

export const levelsAbove = (edges: readonly GraphEdge[], starts: readonly string[]): ReadonlyMap<string, number> =>
  levelsFrom(edges, starts, true)

export const connectedTo = (edges: readonly GraphEdge[], starts: readonly string[]): ReadonlySet<string> =>
  new Set(levelsFrom(edges, starts, false).keys())
