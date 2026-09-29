/**
 * The TypeScript / JavaScript call graph — the declaration-level counterpart of
 * {@link ./index}'s import graph.
 *
 * This supplies the language primitives the generic search
 * ({@link callGraphFrom}) runs on: the declarations of a file, the local names in
 * a file that refer to a target, and where a name is called. The one hard part
 * it owns is resolution — proving a local name is the target, which is where
 * barrels are paid for: a caller may import the target through a re-exporting
 * index, so a name is chased through `export … from` and `export *` hops
 * ({@link exportReaches}) until it lands on the target's file, or does not.
 *
 * The candidate loop, call-to-declaration attribution and dedupe are **not**
 * here — they are language-neutral and live in `callSearch.ts`. Everything that
 * remains is grammar- or module-system-specific.
 *
 * The resolution half is factored into {@link typescriptResolver}: a per-file
 * parse cache, import/barrel resolution, and the "which local names mean the
 * target" question. The call graph reads it; so does the forward value-flow pass
 * ({@link ./valueFlow}), so the two share exactly one copy of resolution.
 */
import type { CallGraph } from "../callerTree"
import { callGraphFrom, type CallSearch, type CallSite } from "../callSearch"
import type { CallCandidates } from "../language"
import type { CodeRef } from "../../types"
import { exportBindingsOf, importBindingsOf } from "./bindings"
import { callSitesIn } from "./callSites"
import { declarationsIn, type LocalDecl } from "./declarations"
import type { Repo } from "."
import { parseCache, type Parsed } from "./estree"

export type { CallCandidates }

/** The last segment of a possibly-qualified name (`A.b` → `b`), as calls write it. */
const writtenName = (name: string): string => name.split(".").pop() ?? name

/** A file range covering everything, for a whole-file call-site scan. */
const WHOLE = { start: { line: 1, column: 0 }, end: { line: Number.MAX_SAFE_INTEGER, column: 0 } }

/** A {@link LocalDecl} in a file, lifted to a {@link CodeRef}. */
export const refFor = (file: string, local: LocalDecl): CodeRef => ({
  file,
  name: local.name,
  definedAt: local.definedAt,
  enclosingRange: local.enclosingRange,
})

/**
 * The TypeScript resolution seam: a per-file parse cache and everything needed
 * to prove a local name means a target, following barrels. Built once over a
 * repo, shared by the call graph and the value-flow pass.
 */
export type Resolver = {
  /** The parsed file, cached; null when it does not read/parse. */
  parsedOf: (file: string) => Promise<Parsed | null>
  /** Resolve a module specifier from a file to a repo file, or null. */
  resolve: (fromFile: string, specifier: string) => Promise<string | null>
  /** The function-like declarations of a file, as {@link CodeRef}s. */
  declarationsOf: (file: string) => Promise<CodeRef[]>
  /** Local names in a file that refer to the target, and how each is called. */
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  /** Every call of a name in a file. */
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

export function typescriptResolver(repo: Repo): Resolver {
  // One parse per file, however many questions are asked of it: the walk's
  // cache when the repo carries one, else this resolver's own.
  const cache = repo.parsed ?? parseCache()
  const parsedOf = (file: string): Promise<Parsed | null> => cache.parsedOf(file, repo.read)

  const resolve = repo.resolve

  /**
   * Whether `file` exports `name` in a way that lands on `target`.
   *
   * `name` is chased through `export … from` renames and `export *` hops until
   * it reaches `target`'s own file under `target`'s name, or runs out. The
   * `seen` set cuts an export cycle so a barrel loop terminates.
   */
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
      // A rename at the target's own file: `export { priceOf as price }`.
      const parsed = await parsedOf(file)
      if (parsed === null) return false
      return exportBindingsOf(parsed).some(
        (one) =>
          (one.kind === "local" && one.exported === name && one.local === written) ||
          (one.kind === "default" && name === "default" && one.local === written),
      )
    }

    const parsed = await parsedOf(file)
    if (parsed === null) return false
    for (const binding of exportBindingsOf(parsed)) {
      if (binding.kind === "re-export" && binding.exported === name) {
        const to = await resolve(file, binding.specifier)
        if (to !== null && (await exportReaches(to, binding.imported, target, next))) return true
      } else if (binding.kind === "star") {
        const to = await resolve(file, binding.specifier)
        if (to !== null && (await exportReaches(to, name, target, next))) return true
      }
    }
    return false
  }

  /** Whether an import binding brings the target in (following barrels). */
  const bindingReaches = async (
    fromFile: string,
    binding: { imported: string; kind: "named" | "default" | "namespace"; specifier: string },
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

  /**
   * The local names in `file` that mean `target`, and how each is called.
   *
   * A named/default binding is called plainly (`p()`); a namespace binding as a
   * member (`ns.priceOf()`); the target's own file needs no import — its written
   * name is already in scope. A type-only import never runs, so it is excluded.
   */
  const localNamesFor = async (file: string, target: CodeRef): Promise<CallSearch[]> => {
    const parsed = await parsedOf(file)
    if (parsed === null) return []
    const written = writtenName(target.name)
    const searches: CallSearch[] = []
    if (file === target.file) searches.push({ name: written, receiver: null })
    for (const binding of importBindingsOf(parsed)) {
      if (binding.typeOnly) continue
      if (!(await bindingReaches(file, binding, target))) continue
      if (binding.kind === "namespace") searches.push({ name: written, receiver: binding.local })
      else searches.push({ name: binding.local, receiver: null })
    }
    return searches
  }

  const callSitesOf = async (file: string, name: string): Promise<CallSite[]> => {
    const parsed = await parsedOf(file)
    if (parsed === null) return []
    return callSitesIn(parsed, WHOLE, name)
  }

  return { parsedOf, resolve, declarationsOf, localNamesFor, callSitesOf }
}

/**
 * The call graph, with one rule of its own: a local function's caller is the
 * function that holds it.
 *
 * A handler declared in a component (`BasketForm.onSubmit`) runs only when that
 * component does, however React fires it — `<form onSubmit={onSubmit}>` is no
 * call — so the climb goes on through the component to whatever renders it.
 * Its name is local and nothing outside can import it, so no search is made.
 */
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

/** The tightest declaration whose body holds another, if any. */
export function holderOf(target: CodeRef, decls: readonly CodeRef[]): CodeRef | undefined {
  const at = (pos: { line: number; column: number }): number => pos.line * 1e6 + pos.column
  let best: CodeRef | undefined
  for (const decl of decls) {
    const outer = decl.enclosingRange
    const inner = target.enclosingRange
    if (at(outer.start) > at(inner.start) || at(outer.end) < at(inner.end)) continue
    if (at(outer.start) === at(inner.start) && at(outer.end) === at(inner.end)) continue
    if (best === undefined || at(decl.enclosingRange.start) > at(best.enclosingRange.start)) best = decl
  }
  return best
}
