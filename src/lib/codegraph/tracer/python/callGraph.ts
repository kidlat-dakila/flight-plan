/**
 * The Python call graph — the declaration-level counterpart of `index.ts`'s
 * import graph.
 *
 * Mirrors `tracer/typescript/callGraph.ts` in structure: this supplies the
 * language primitives the generic search ({@link callGraphFrom}) runs on —
 * the declarations of a file, the local names in a file that refer to a
 * target, and where a name is called. The one hard part it owns is
 * resolution — proving a local name is the target, which is where barrels
 * are paid for: a caller may import the target through a re-exporting
 * `__init__.py`, so a name is chased through `reExportsOf` hops
 * ({@link initReaches}) until it lands on the target's file, or does not.
 *
 * The candidate loop, call-to-declaration attribution and dedupe are **not**
 * here — they are language-neutral and live in `callSearch.ts`. Everything
 * that remains is grammar- or module-system-specific.
 *
 * The resolution half is factored into {@link pythonResolver}: a per-file
 * parse cache, import/barrel resolution, and the "which local names mean the
 * target" question. The call graph reads it; so will the forward value-flow
 * pass (a later task), so the two share exactly one copy of resolution.
 */
import type { Tree } from "web-tree-sitter"
import type { CodeRef, Range } from "../../types"
import type { CallGraph } from "../callerTree"
import { callGraphFrom, type CallSearch, type CallSite } from "../callSearch"
import type { CallCandidates } from "../language"
import { treeCache } from "../parse"
import { callSitesIn } from "./callSites"
import { declarationsIn, type LocalDecl } from "./declarations"
import type { PyRepo } from "."
import { importBindingsOf, reExportsOf } from "./imports"
import { resolveModule } from "./resolve"

export type { CallCandidates }

/** The last segment of a possibly-qualified name (`Class.method` → `method`, `pkg.pricing` → `pricing`). */
const writtenName = (name: string): string => name.split(".").pop() ?? name

/**
 * The name a file is imported under, as far as a call site can see it:
 * `pkg/pricing.py` → `"pricing"`, `pkg/__init__.py` → `"pkg"` (the package's
 * own name, since the file itself carries no segment for it).
 */
const stemOf = (file: string): string => {
  const slash = file.lastIndexOf("/")
  const base = slash === -1 ? file : file.slice(slash + 1)
  if (base === "__init__.py" || base === "__init__.pyi") {
    const dir = slash === -1 ? "" : file.slice(0, slash)
    const dslash = dir.lastIndexOf("/")
    return dslash === -1 ? dir : dir.slice(dslash + 1)
  }
  return base.replace(/\.pyi?$/, "")
}

/** A file range covering everything, for a whole-file call-site scan. */
const WHOLE: Range = { start: { line: 1, column: 0 }, end: { line: Number.MAX_SAFE_INTEGER, column: 0 } }

/** A {@link LocalDecl} in a file, lifted to a {@link CodeRef}. */
export const refFor = (file: string, local: LocalDecl): CodeRef => ({
  file,
  name: local.name,
  definedAt: local.definedAt,
  enclosingRange: local.enclosingRange,
})

/**
 * The Python resolution seam: a per-file parse cache and everything needed to
 * prove a local name means a target, following `__init__.py` barrels. Built
 * once over a repo, shared by the call graph and the value-flow pass.
 */
export type Resolver = {
  /** The parsed tree for a file, cached; null when it does not read/parse. */
  treeOf: (file: string) => Promise<Tree | null>
  /** Resolve an import (module, relative level, imported name) from a file to a repo file, or null. */
  resolveModule: (fromFile: string, module: string, level: number, imported: string) => Promise<string | null>
  /** The function-like declarations of a file, as {@link CodeRef}s. */
  declarationsOf: (file: string) => Promise<CodeRef[]>
  /** Local names in a file that refer to the target, and how each is called. */
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  /** Every call of a name in a file. */
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

export function pythonResolver(repo: PyRepo): Resolver {
  // One parse per file, however many questions are asked of it: the walk's
  // cache when the repo carries one, else this resolver's own.
  const trees = repo.trees ?? treeCache()
  const treeOf = (file: string): Promise<Tree | null> => trees.treeOf(file, repo.read)

  const resolveModuleFor = async (
    fromFile: string,
    module: string,
    level: number,
    imported: string,
  ): Promise<string | null> => {
    const roots = await repo.rootsFor(fromFile)
    const found = resolveModule(fromFile, module, level, imported, repo.files, roots, repo.packages ?? null)
    return found.kind === "file" ? found.path : null
  }

  /**
   * Whether `file` binds `name` in a way that lands on `target`.
   *
   * `name` is chased through `__init__.py` re-exports until it reaches
   * `target`'s own file under `target`'s written name, or runs out. The
   * `seen` set cuts a re-export cycle so a barrel loop terminates.
   */
  const initReaches = async (
    file: string,
    name: string,
    target: CodeRef,
    seen: ReadonlySet<string>,
  ): Promise<boolean> => {
    const key = `${file}#${name}`
    if (seen.has(key)) return false
    const next = new Set(seen).add(key)
    const written = writtenName(target.name)

    if (file === target.file && name === written) return true
    if (!file.endsWith("__init__.py") && !file.endsWith("__init__.pyi")) return false

    const tree = await treeOf(file)
    if (tree === null) return false
    for (const one of reExportsOf(tree)) {
      if (one.exported !== name) continue
      // A re-export's module is "" for a bare `from . import name` — the
      // current package's own `__init__`. `resolveModule` already resolves
      // that relative to `file`'s own directory via `level`, not as a
      // missing module, so no special case is needed here.
      const to = await resolveModuleFor(file, one.module, one.level, one.imported)
      if (to !== null && (await initReaches(to, one.imported, target, next))) return true
    }
    return false
  }

  /**
   * Whether an import binding brings the target in (following `__init__`
   * barrels), and whether it does so as a module reference or a plain name.
   *
   * `from pkg import thing` is ambiguous on its face (`resolve.ts`'s own
   * words): `thing` may be a submodule of `pkg` (`pkg/thing.py`) or an
   * attribute defined in `pkg`'s own file. `resolveModule` already prefers
   * the submodule reading when both exist; this tells the two apart by
   * comparing the resolved file's own name to `imported` — a submodule's
   * file is named after it, an attribute's is not. A plain `import a.b`
   * (`imported === ""`) is unambiguous: it always names a module.
   */
  const bindingReaches = async (
    fromFile: string,
    binding: { module: string; level: number; imported: string },
    target: CodeRef,
  ): Promise<{ file: string; isModuleRef: boolean } | null> => {
    const to = await resolveModuleFor(fromFile, binding.module, binding.level, binding.imported)
    if (to === null) return null
    const isModuleRef = binding.imported === "" || stemOf(to) === binding.imported
    const name = isModuleRef ? writtenName(target.name) : binding.imported
    return (await initReaches(to, name, target, new Set())) ? { file: to, isModuleRef } : null
  }

  const declarationsOf = async (file: string): Promise<CodeRef[]> => {
    const tree = await treeOf(file)
    if (tree === null) return []
    return declarationsIn(tree).map((local) => refFor(file, local))
  }

  /**
   * The local names in `file` that mean `target`, and how each is called.
   *
   * A from-import naming an attribute is called plainly (`p()`); a module
   * reference (a plain `import a.b`, or a from-import of a submodule) as a
   * member (`pricing.price_of()`); the target's own file needs no import —
   * its written name is already in scope. A `TYPE_CHECKING`-guarded import
   * never runs, so it is excluded.
   *
   * A module reference's receiver is the bound local name exactly as written
   * — `binding.local` — which `callSitesIn` now reports verbatim as the
   * receiver even for a multi-segment, unaliased module (`import
   * pkg.pricing` binds `"pkg.pricing"`; a call `pkg.pricing.price_of()`
   * reports receiver `"pkg.pricing"`), so the two match exactly rather than
   * degrading to an unreceipted search that would also match an unrelated
   * same-named bare call.
   */
  const localNamesFor = async (file: string, target: CodeRef): Promise<CallSearch[]> => {
    const tree = await treeOf(file)
    if (tree === null) return []
    const written = writtenName(target.name)
    const searches: CallSearch[] = []
    if (file === target.file) searches.push({ name: written, receiver: null })
    for (const binding of importBindingsOf(tree)) {
      if (binding.typeOnly) continue
      const reached = await bindingReaches(file, binding, target)
      if (reached === null) continue
      if (reached.isModuleRef) {
        searches.push({ name: written, receiver: binding.local })
      } else {
        searches.push({ name: binding.local, receiver: null })
      }
    }
    return searches
  }

  const callSitesOf = async (file: string, name: string): Promise<CallSite[]> => {
    const tree = await treeOf(file)
    if (tree === null) return []
    return callSitesIn(tree, WHOLE, name)
  }

  return { treeOf, resolveModule: resolveModuleFor, declarationsOf, localNamesFor, callSitesOf }
}

export function pythonCallGraph(repo: PyRepo, candidates: CallCandidates): CallGraph {
  const resolver = pythonResolver(repo)
  return callGraphFrom({
    candidates,
    declarationsOf: resolver.declarationsOf,
    localNamesFor: resolver.localNamesFor,
    callSitesOf: resolver.callSitesOf,
  })
}
