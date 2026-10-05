import { someInSequence } from "@/core/sequence"
import { callGraphFrom, type CallSearch, type CallSite } from "@/core/tracer/call-search"
import type { CallGraph } from "@/core/tracer/caller-tree"
import type { CallCandidates } from "@/core/tracer/language"
import type { CodeRef, Pos, Range } from "@/core/types"
import { exportBindingsOf, importBindingsOf } from "./bindings"
import { callSitesIn } from "./call-sites"
import { declarationsIn, type LocalDecl } from "./declarations"
import { parseCache, type Parsed } from "./estree"
import type { Repo } from "."

export type { CallCandidates }

const writtenName = (name: string): string => name.slice(name.lastIndexOf(".") + 1)

const WHOLE = { start: { line: 1, column: 0 }, end: { line: Number.MAX_SAFE_INTEGER, column: 0 } }

export const refFor = (file: string, local: LocalDecl): CodeRef => ({
  file,
  name: local.name,
  definedAt: local.definedAt,
  enclosingRange: local.enclosingRange,
})

export interface Resolver {
  parsedOf: (file: string) => Promise<Parsed | null>
  resolve: (fromFile: string, specifier: string) => Promise<string | null>
  declarationsOf: (file: string) => Promise<CodeRef[]>
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

export function typescriptResolver(repo: Repo): Resolver {
  const cache = repo.parsed ?? parseCache()
  const parsedOf = async (file: string): Promise<Parsed | null> => cache.parsedOf(file, repo.read)

  const resolve = repo.resolve

  const exportReaches = async (
    file: string,
    name: string,
    target: CodeRef,
    seen: ReadonlySet<string>,
  ): Promise<boolean> => {
    const key = `${file}#${name}`
    if (seen.has(key)) return false
    const next = new Set(seen).add(key)
    const written = writtenName(target.name)

    if (file === target.file) {
      if (name === written) return true
      const parsed = await parsedOf(file)
      if (parsed === null) return false
      return exportBindingsOf(parsed).some(
        (one) =>
          (one.kind === "local" && one.exported === name && one.local === written)
          || (one.kind === "default" && name === "default" && one.local === written),
      )
    }

    const parsed = await parsedOf(file)
    if (parsed === null) return false
    return someInSequence(exportBindingsOf(parsed), async (binding) => {
      const isNamed = binding.kind === "re-export" && binding.exported === name
      if (!isNamed && binding.kind !== "star") return false
      const to = await resolve(file, binding.specifier)
      return to !== null && exportReaches(to, binding.kind === "star" ? name : binding.imported, target, next)
    })
  }

  const bindingReaches = async (
    fromFile: string,
    binding: { imported: string, kind: "named" | "default" | "namespace", specifier: string },
    target: CodeRef,
  ): Promise<boolean> => {
    const to = await resolve(fromFile, binding.specifier)
    if (to === null) return false
    const name = binding.kind === "namespace" ? writtenName(target.name) : binding.imported
    return exportReaches(to, name, target, new Set())
  }

  const declarationsOf = async (file: string): Promise<CodeRef[]> => {
    const parsed = await parsedOf(file)
    if (parsed === null) return []
    return declarationsIn(parsed).map((local) => refFor(file, local))
  }

  const localNamesFor = async (file: string, target: CodeRef): Promise<CallSearch[]> => {
    const parsed = await parsedOf(file)
    if (parsed === null) return []
    const written = writtenName(target.name)
    const own: CallSearch[] = file === target.file ? [{ name: written, receiver: null }] : []
    const imported = await Promise.all(
      importBindingsOf(parsed)
        .filter((binding) => !binding.typeOnly)
        .map(async (binding): Promise<CallSearch[]> => {
          if (!(await bindingReaches(file, binding, target))) return []
          return [binding.kind === "namespace" ? { name: written, receiver: binding.local } : { name: binding.local, receiver: null }]
        }),
    )
    return [...own, ...imported.flat()]
  }

  const callSitesOf = async (file: string, name: string): Promise<CallSite[]> => {
    const parsed = await parsedOf(file)
    if (parsed === null) return []
    return callSitesIn(parsed, WHOLE, name)
  }

  return { parsedOf, resolve, declarationsOf, localNamesFor, callSitesOf }
}

export function typescriptCallGraph(repo: Repo, candidates: CallCandidates): CallGraph {
  const resolver = typescriptResolver(repo)
  const graph = callGraphFrom({
    candidates,
    declarationsOf: resolver.declarationsOf,
    localNamesFor: resolver.localNamesFor,
    callSitesOf: resolver.callSitesOf,
  })
  return {
    callersOf: async (target) => {
      const holder = holderOf(target, await resolver.declarationsOf(target.file))
      return holder === undefined ? graph.callersOf(target) : [{ code: holder, calledAt: target.definedAt }]
    },
  }
}

const LINE_WEIGHT = 1e6

const offsetOf = (pos: Pos): number => pos.line * LINE_WEIGHT + pos.column

const holds = (outer: Range, inner: Range): boolean => {
  const isAround = offsetOf(outer.start) <= offsetOf(inner.start) && offsetOf(outer.end) >= offsetOf(inner.end)
  const isSame = offsetOf(outer.start) === offsetOf(inner.start) && offsetOf(outer.end) === offsetOf(inner.end)
  return isAround && !isSame
}

export function holderOf(target: CodeRef, decls: readonly CodeRef[]): CodeRef | undefined {
  return decls
    .filter((decl) => holds(decl.enclosingRange, target.enclosingRange))
    .reduce<CodeRef | undefined>(
      (best, decl) => (best === undefined || offsetOf(decl.enclosingRange.start) > offsetOf(best.enclosingRange.start) ? decl : best),
      undefined,
    )
}
