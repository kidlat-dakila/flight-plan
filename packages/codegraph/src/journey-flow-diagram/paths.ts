import type { JourneyFlow, JourneyNode } from "@flightplan/configurations"

const STEP_SEPARATOR = " → "
const CHANGED_MARK = " (changed)"

const nameOf = (node: JourneyNode): string => {
  if (node.kind === "entry-point") return `(${node.trigger})`
  return `${node.declaration}${node.changeType === "diff" ? CHANGED_MARK : ""}`
}

const pathsFrom = (flow: JourneyFlow, node: JourneyNode, walkedIds: ReadonlySet<string>): string[][] => {
  const next = flow.edges
    .filter((edge) => edge.from === node.id && !walkedIds.has(edge.to))
    .flatMap((edge) => flow.nodes.filter((candidate) => candidate.id === edge.to))
  if (next.length === 0) return [[nameOf(node)]]
  const walked = new Set([...walkedIds, node.id])
  return next.flatMap((following) => pathsFrom(flow, following, walked).map((path) => [nameOf(node), ...path]))
}

export const listJourneyPaths = (flow: JourneyFlow | null): string[] => {
  if (flow === null) return []
  const reachedIds = new Set(flow.edges.map((edge) => edge.to))
  const starts = flow.nodes.filter((node) => node.kind === "entry-point" || !reachedIds.has(node.id))
  return [...new Set(starts.flatMap((start) => pathsFrom(flow, start, new Set())).map((path) => path.join(STEP_SEPARATOR)))].sort()
}
