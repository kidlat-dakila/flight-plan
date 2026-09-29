/**
 * The language-neutral "who calls this, one level up" search.
 *
 * {@link traceCallers} climbs the tree; this builds the single-level
 * {@link CallGraph} it climbs on. The algorithm is the same in any language:
 * scan the candidate files, take each call of a name that refers to the target,
 * attribute the call to the declaration that encloses it, and dedupe. The
 * language supplies only the primitives through a {@link CallProbe} — which files
 * to look at, what declarations a file holds, which local names in a file mean
 * the target, and where a name is called. Everything grammar- and
 * module-system-specific (barrels, import kinds, resolution) stays behind those;
 * none of it appears here.
 */
import { keyOf, type CallGraph, type Caller } from "./callerTree"
import type { CodeRef, Pos, Range } from "../types"

/** One call of a name: where it is written, and its member receiver if any. */
export type CallSite = { at: Range; receiver: string | null }

/** A local name to look for, and the receiver a matching call must have. */
export type CallSearch = { name: string; receiver: string | null }

/**
 * The language primitives the search runs on.
 *
 * Each is a closure the language builds — and owns the parse cache behind, so
 * the algorithm here re-reads nothing. `localNamesFor` is where a language folds
 * in its module semantics (imports, aliases, barrels, same-file scope).
 */
export type CallProbe = {
  /** A loose over-set of files that might call the target, to be verified here. */
  candidates: (target: CodeRef) => Promise<string[]>
  /** The function-like declarations of a file. */
  declarationsOf: (file: string) => Promise<CodeRef[]>
  /** Local names in a file that refer to the target, and how each is called. */
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  /** Every call of a name in a file. */
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (outer: Range, pos: Pos): boolean =>
  atOrAfter(pos, outer.start) && atOrAfter(outer.end, pos)

/** A comparable size for a range, to pick the tightest of several that fit. */
const area = (r: Range): number => (r.end.line - r.start.line) * 1e6 + (r.end.column - r.start.column)

/** The tightest declaration whose body contains a position, if any. */
function containing(refs: readonly CodeRef[], at: Range): CodeRef | undefined {
  let best: CodeRef | undefined
  for (const ref of refs) {
    if (!contains(ref.enclosingRange, at.start)) continue
    if (best === undefined || area(ref.enclosingRange) < area(best.enclosingRange)) best = ref
  }
  return best
}

export function callGraphFrom(probe: CallProbe): CallGraph {
  const callersOf = async (target: CodeRef): Promise<Caller[]> => {
    const targetKey = keyOf(target)
    const found = new Map<string, Caller>() // caller key → its earliest call site

    for (const file of await probe.candidates(target)) {
      const searches = await probe.localNamesFor(file, target)
      if (searches.length === 0) continue
      const refs = await probe.declarationsOf(file)

      for (const search of searches) {
        for (const site of await probe.callSitesOf(file, search.name)) {
          if (site.receiver !== search.receiver) continue
          const caller = containing(refs, site.at)
          // No enclosing declaration is a top-level call; a declaration is not
          // its own caller (a recursive call).
          if (caller === undefined) continue
          const key = keyOf(caller)
          if (key === targetKey) continue
          if (!found.has(key)) found.set(key, { code: caller, calledAt: site.at })
        }
      }
    }

    return [...found.values()].sort((one, two) => keyOf(one.code).localeCompare(keyOf(two.code)))
  }
  return { callersOf }
}
