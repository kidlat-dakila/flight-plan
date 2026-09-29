/**
 * The inverted caller trees for a change, climbed with the tracer.
 *
 * Roots at each declaration in the changed file whose body the diff touched,
 * then climbs its callers upward through {@link traceCallers} — every
 * declaration that calls it, and their callers, to the entry points. One
 * {@link DiagramNode} tree per changed declaration.
 *
 * This is the reused climb/materialise half of the old SCIP builder. What
 * changed is the *input*: cross-file resolution no longer comes from a SCIP
 * index but from a lazy {@link CallGraph} (grep candidates, parse, resolve
 * imports, find call sites). Everything grammar-specific lives behind the graph;
 * this file only picks roots and climbs.
 */
import { traceCallers, type CallGraph } from "./tracer/callerTree"
import type { CodeRef, Diagram, DiagramNode } from "./types"
import { count } from "./walkStats"

export type BuildStackTreeInput = {
  /** The lazy caller graph — how "who calls this" is answered, per language. */
  graph: CallGraph
  /** Every function-like declaration in the changed file. */
  changed: readonly CodeRef[]
  /** The lines the diff changed in that file, `[from, to]` inclusive, 1-based. */
  locDiff: readonly [number, number][]
  /**
   * How a root's reach is climbed. Defaults to the call-only climb over
   * {@link graph}. The diagram passes the full value-flow reach here so a
   * handoff (hook / prop / collection / return) and its escapes are followed;
   * the blast radius leaves it unset and stays call-only.
   */
  reach?: (root: CodeRef) => Promise<DiagramNode>
}

/** Whether one range lies inside another and is not the same range. */
const strictlyInside = (inner: CodeRef, outer: CodeRef): boolean => {
  const a = inner.enclosingRange
  const b = outer.enclosingRange
  const starts = a.start.line > b.start.line || (a.start.line === b.start.line && a.start.column >= b.start.column)
  const ends = a.end.line < b.end.line || (a.end.line === b.end.line && a.end.column <= b.end.column)
  return starts && ends && !(a.start.line === b.start.line && a.start.column === b.start.column && a.end.line === b.end.line && a.end.column === b.end.column)
}

/**
 * The changed lines a declaration owns: those in its body and not in a
 * declaration nested in it. A line belongs to the tightest function holding
 * it, so a change inside a local handler is the handler's, not also its
 * component's. As ranges, 1-based and inclusive.
 */
export function ownedChanges(
  ref: CodeRef,
  locDiff: readonly [number, number][],
  all: readonly CodeRef[],
): [number, number][] {
  const inner = all.filter((other) => other !== ref && other.file === ref.file && strictlyInside(other, ref))
  const out: [number, number][] = []
  for (const [from, to] of locDiff) {
    let run: [number, number] | null = null
    for (let line = Math.max(from, ref.enclosingRange.start.line); line <= Math.min(to, ref.enclosingRange.end.line); line += 1) {
      const nestedHere = inner.some((other) => other.enclosingRange.start.line <= line && line <= other.enclosingRange.end.line)
      if (nestedHere) {
        run = null
        continue
      }
      if (run !== null && run[1] === line - 1) run[1] = line
      else out.push((run = [line, line]))
    }
  }
  return out
}

/** Whether a declaration owns any changed line. See {@link ownedChanges}. */
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
  const climb = reach ?? ((root: CodeRef) => traceCallers(graph, root))
  return Promise.all(roots.map(climb))
}
