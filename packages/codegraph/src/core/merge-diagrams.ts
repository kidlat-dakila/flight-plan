import { iterateUntil } from "./iterate"
import { Memo } from "./memo"
import { idOf, keyOf } from "./tracer/caller-tree"
import type { CodeRef, Diagram, DiagramNode, ExecutionStep, Range } from "./types"

interface Info {
  code: CodeRef
  executionSteps?: ExecutionStep[]
  escape?: DiagramNode["escape"]
  children?: DiagramNode[]
}
interface Edge { at?: Range, via?: DiagramNode["via"] }
type Edges = ReadonlyMap<string, ReadonlyMap<string, Edge>>
interface CallLink { callee: string, caller: string, edge: Edge }
interface Placement { node: DiagramNode, placed: ReadonlySet<string> }
interface Placements { nodes: readonly DiagramNode[], placed: ReadonlySet<string> }
interface Component { stack: readonly string[], seen: ReadonlySet<string>, members: readonly string[] }
interface Forest { roots: readonly DiagramNode[], seen: ReadonlySet<string>, placed: ReadonlySet<string> }

const EMPTY: Range = { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }
const EMPTY_REF: CodeRef = { file: "", name: "", definedAt: EMPTY, enclosingRange: EMPTY }
const NO_EDGES: ReadonlyMap<string, Edge> = new Map()

const link = (edges: Edges, from: string, to: string, edge: Edge): Edges => {
  const inner = edges.get(from) ?? NO_EDGES
  return inner.has(to) ? edges : new Map(edges).set(from, new Map(inner).set(to, edge))
}

const nodesOf = (node: DiagramNode): DiagramNode[] => [node, ...node.callers.flatMap(nodesOf)]

const linksOf = (node: DiagramNode): CallLink[] =>
  node.callers.flatMap((caller) => [
    { callee: keyOf(node.code), caller: keyOf(caller.code), edge: { at: caller.calledAt, via: caller.via } },
    ...linksOf(caller),
  ])

const mergeInfo = (held: Info, node: DiagramNode): Info => ({
  ...held,
  ...(held.executionSteps === undefined && node.executionSteps !== undefined ? { executionSteps: node.executionSteps } : {}),
  ...(held.escape === undefined && node.escape !== undefined ? { escape: node.escape } : {}),
  ...(held.children === undefined && node.children !== undefined ? { children: node.children } : {}),
})

const infoOf = (nodes: readonly DiagramNode[]): ReadonlyMap<string, Info> =>
  nodes.reduce<ReadonlyMap<string, Info>>((info, node) => {
    const key = keyOf(node.code)
    return new Map(info).set(key, mergeInfo(info.get(key) ?? { code: node.code }, node))
  }, new Map())

export function mergeDiagrams(diagrams: readonly Diagram[]): Diagram {
  const roots = diagrams.flat()
  const info = infoOf(roots.flatMap(nodesOf))
  const links = roots.flatMap(linksOf)
  const callersOf = links.reduce<Edges>((edges, { callee, caller, edge }) => link(edges, callee, caller, edge), new Map())
  const calleesOf = links.reduce<Edges>((edges, { callee, caller, edge }) => link(edges, caller, callee, edge), new Map())

  const neighbours = (key: string): string[] => [
    ...(callersOf.get(key)?.keys() ?? []),
    ...(calleesOf.get(key)?.keys() ?? []),
  ]

  const depths = new Memo<string, number>()
  const depthOf = (key: string, path: ReadonlySet<string>): number => {
    const cached = depths.find(key)
    if (cached !== undefined) return cached
    if (path.has(key)) return 0
    const next = new Set(path).add(key)
    const best = [...(callersOf.get(key)?.keys() ?? [])].reduce((deepest, caller) => Math.max(deepest, 1 + depthOf(caller, next)), 0)
    return depths.store(key, best)
  }

  const placeEach = (edges: ReadonlyMap<string, Edge>, placed: ReadonlySet<string>): Placements =>
    [...edges].reduce<Placements>(
      (held, [key, edge]) => {
        if (held.placed.has(key)) return held
        const placement = place(key, edge, held.placed)
        return { nodes: [...held.nodes, placement.node], placed: placement.placed }
      },
      { nodes: [], placed },
    )

  const place = (key: string, edge: Edge | undefined, placedBefore: ReadonlySet<string>): Placement => {
    const held = info.get(key)
    const code = held?.code ?? EMPTY_REF
    const callers = placeEach(callersOf.get(key) ?? NO_EDGES, new Set(placedBefore).add(key))
    const callees = placeEach(calleesOf.get(key) ?? NO_EDGES, callers.placed)
    const node: DiagramNode = {
      id: idOf(code),
      code,
      ...(edge?.at ? { calledAt: edge.at } : {}),
      ...(edge?.via ? { via: edge.via } : {}),
      ...(held?.escape ? { escape: held.escape } : {}),
      ...(held?.executionSteps ? { executionSteps: held.executionSteps } : {}),
      ...(held?.children ? { children: held.children } : {}),
      callers: [...callers.nodes],
      ...(callees.nodes.length > 0 ? { callees: [...callees.nodes] } : {}),
    }
    return { node, placed: callees.placed }
  }

  const visitNext = (component: Component): Component => {
    const key = component.stack[component.stack.length - 1]
    const rest = component.stack.slice(0, -1)
    if (component.seen.has(key)) return { ...component, stack: rest }
    return { stack: [...rest, ...neighbours(key)], seen: new Set(component.seen).add(key), members: [...component.members, key] }
  }

  const deepestOf = (members: readonly string[], first: string): string =>
    members.reduce<string>((best, key) => {
      const depth = depthOf(key, new Set())
      const bestDepth = depthOf(best, new Set())
      return depth > bestDepth || (depth === bestDepth && key < best) ? key : best
    }, first)

  const forest = [...info.keys()].reduce<Forest>(
    (held, start) => {
      if (held.seen.has(start)) return held
      const component = iterateUntil<Component>({ stack: [start], seen: held.seen, members: [] }, (one) => one.stack.length === 0, visitNext)
      const placement = place(deepestOf(component.members, start), undefined, held.placed)
      return { roots: [...held.roots, placement.node], seen: component.seen, placed: placement.placed }
    },
    { roots: [], seen: new Set(), placed: new Set() },
  )

  return [...forest.roots]
}
