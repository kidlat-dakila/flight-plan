import { traceCallers, type CallGraph } from "./tracer/caller-tree"
import type { CodeRef, Diagram, DiagramNode } from "./types"
import { count } from "./walk-stats"

export interface BuildStackTreeInput {
  graph: CallGraph
  changed: readonly CodeRef[]
  locDiff: readonly [number, number][]
  reach?: (root: CodeRef) => Promise<DiagramNode>
}

const strictlyInside = (inner: CodeRef, outer: CodeRef): boolean => {
  const a = inner.enclosingRange
  const b = outer.enclosingRange
  const isStartInside = a.start.line > b.start.line || (a.start.line === b.start.line && a.start.column >= b.start.column)
  const isEndInside = a.end.line < b.end.line || (a.end.line === b.end.line && a.end.column <= b.end.column)
  return isStartInside && isEndInside && !(a.start.line === b.start.line && a.start.column === b.start.column && a.end.line === b.end.line && a.end.column === b.end.column)
}

export function ownedChanges(
  ref: CodeRef,
  locDiff: readonly [number, number][],
  all: readonly CodeRef[],
): [number, number][] {
  const inner = all.filter((other) => other !== ref && other.file === ref.file && strictlyInside(other, ref))
  const isNested = (line: number): boolean =>
    inner.some((other) => other.enclosingRange.start.line <= line && line <= other.enclosingRange.end.line)
  return locDiff.flatMap(([from, to]) =>
    runsOf(linesBetween(Math.max(from, ref.enclosingRange.start.line), Math.min(to, ref.enclosingRange.end.line)).filter((line) => !isNested(line))),
  )
}

const linesBetween = (from: number, to: number): number[] => Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)

const runsOf = (lines: readonly number[]): [number, number][] =>
  lines.reduce<[number, number][]>((runs, line) => {
    const last = runs[runs.length - 1]
    return runs.length > 0 && last[1] === line - 1 ? [...runs.slice(0, -1), [last[0], line]] : [...runs, [line, line]]
  }, [])

const touched = (ref: CodeRef, locDiff: readonly [number, number][], all: readonly CodeRef[]): boolean =>
  ownedChanges(ref, locDiff, all).length > 0

export async function buildStackTree({
  graph,
  changed,
  locDiff,
  reach,
}: BuildStackTreeInput): Promise<Diagram> {
  const roots = changed.filter((ref) => touched(ref, locDiff, changed))
  count("declarations", changed.length)
  count("roots", roots.length)
  const climb = reach ?? (async (root: CodeRef) => traceCallers(graph, root))
  return Promise.all(roots.map(climb))
}
