export interface Connection {
  readonly id: string
  readonly from: string
  readonly to: string
}

export interface Neighbourhood {
  readonly nodeIds: ReadonlySet<string>
  readonly edgeIds: ReadonlySet<string>
}

const EMPTY_NEIGHBOURHOOD: Neighbourhood = { nodeIds: new Set(), edgeIds: new Set() }

export const neighbourhoodOf = (connections: readonly Connection[], nodeId: string | null): Neighbourhood => {
  if (nodeId === null) return EMPTY_NEIGHBOURHOOD
  const touching = connections.filter((connection) => connection.from === nodeId || connection.to === nodeId)
  return {
    nodeIds: new Set([nodeId, ...touching.flatMap((connection) => [connection.from, connection.to])]),
    edgeIds: new Set(touching.map((connection) => connection.id)),
  }
}

const reachFrom = (connections: readonly Connection[], reached: ReadonlySet<string>, frontier: readonly string[]): ReadonlySet<string> => {
  if (frontier.length === 0) return reached
  const next = [...new Set(connections.filter((connection) => frontier.includes(connection.from)).map((connection) => connection.to))]
    .filter((nodeId) => !reached.has(nodeId))
  return reachFrom(connections, new Set([...reached, ...next]), next)
}

export const downstreamOf = (connections: readonly Connection[], nodeIds: readonly string[]): ReadonlySet<string> =>
  reachFrom(connections, new Set(nodeIds), nodeIds)

const reversed = (connections: readonly Connection[]): Connection[] =>
  connections.map(({ id, from, to }) => ({ id, from: to, to: from }))

export const lineageOf = (connections: readonly Connection[], nodeId: string): ReadonlySet<string> =>
  new Set([...downstreamOf(reversed(connections), [nodeId]), ...downstreamOf(connections, [nodeId])])

export const sourcesLeadingTo = (connections: readonly Connection[], sourceIds: readonly string[], nodeId: string): string[] =>
  sourceIds.filter((sourceId) => downstreamOf(connections, [sourceId]).has(nodeId))

export const cutOffBy = (connections: readonly Connection[], collapsedIds: readonly string[], rootIds: readonly string[]): ReadonlySet<string> => {
  const openConnections = connections.filter((connection) => !collapsedIds.includes(connection.from) && !collapsedIds.includes(connection.to))
  const keptIds = downstreamOf(openConnections, rootIds.filter((rootId) => !collapsedIds.includes(rootId)))
  return new Set([...downstreamOf(connections, collapsedIds)].filter((nodeId) => !keptIds.has(nodeId)))
}

export const pathFrom = (connections: readonly Connection[], nodeId: string): Neighbourhood => {
  const nodeIds = downstreamOf(connections, [nodeId])
  return {
    nodeIds,
    edgeIds: new Set(connections.filter((connection) => nodeIds.has(connection.from) && nodeIds.has(connection.to)).map((connection) => connection.id)),
  }
}

export const hiddenBehind = (
  connections: readonly Connection[],
  hiddenSourceIds: readonly string[],
  shownSourceIds: readonly string[],
): ReadonlySet<string> => {
  const keptIds = new Set([...hiddenSourceIds, ...downstreamOf(connections, shownSourceIds)])
  return new Set([...downstreamOf(connections, hiddenSourceIds)].filter((nodeId) => !keptIds.has(nodeId)))
}
