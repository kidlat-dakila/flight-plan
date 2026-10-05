import type { CodeRef, Pos, Range } from "@/core/types"
import { keyOf, type CallGraph, type Caller } from "./caller-tree"

export interface CallSite { at: Range, receiver: string | null }

export interface CallSearch { name: string, receiver: string | null }

export interface CallProbe {
  candidates: (target: CodeRef) => Promise<string[]>
  declarationsOf: (file: string) => Promise<CodeRef[]>
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (outer: Range, pos: Pos): boolean =>
  atOrAfter(pos, outer.start) && atOrAfter(outer.end, pos)

const LINE_WEIGHT = 1e6

const area = (r: Range): number => (r.end.line - r.start.line) * LINE_WEIGHT + (r.end.column - r.start.column)

function containing(refs: readonly CodeRef[], at: Range): CodeRef | undefined {
  return refs
    .filter((ref) => contains(ref.enclosingRange, at.start))
    .reduce<CodeRef | undefined>(
      (best, ref) => (best === undefined || area(ref.enclosingRange) < area(best.enclosingRange) ? ref : best),
      undefined,
    )
}

async function callersIn(probe: CallProbe, file: string, target: CodeRef): Promise<Caller[]> {
  const searches = await probe.localNamesFor(file, target)
  if (searches.length === 0) return []
  const refs = await probe.declarationsOf(file)
  const targetKey = keyOf(target)
  const sitesPerSearch = await Promise.all(
    searches.map(async (search) => (await probe.callSitesOf(file, search.name)).filter((site) => site.receiver === search.receiver)),
  )
  return sitesPerSearch.flat().flatMap((site) => {
    const caller = containing(refs, site.at)
    return caller === undefined || keyOf(caller) === targetKey ? [] : [{ code: caller, calledAt: site.at }]
  })
}

export function callGraphFrom(probe: CallProbe): CallGraph {
  const callersOf = async (target: CodeRef): Promise<Caller[]> => {
    const files = await probe.candidates(target)
    const callers = await Promise.all(files.map(async (file) => callersIn(probe, file, target)))
    const found = callers.flat().reduce<ReadonlyMap<string, Caller>>((held, caller) => {
      const key = keyOf(caller.code)
      return held.has(key) ? held : new Map(held).set(key, caller)
    }, new Map())

    return [...found.values()].sort((one, two) => keyOf(one.code).localeCompare(keyOf(two.code)))
  }
  return { callersOf }
}
