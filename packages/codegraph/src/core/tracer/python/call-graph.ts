import type { Tree } from "web-tree-sitter"
import { someInSequence } from "@/core/sequence"
import { callGraphFrom, type CallSearch, type CallSite } from "@/core/tracer/call-search"
import type { CallGraph } from "@/core/tracer/caller-tree"
import type { CallCandidates } from "@/core/tracer/language"
import { treeCache } from "@/core/tracer/parse"
import type { CodeRef, Range } from "@/core/types"
import { callSitesIn } from "./call-sites"
import { declarationsIn, type LocalDecl } from "./declarations"
import { importBindingsOf, reExportsOf } from "./imports"
import { resolveModule } from "./resolve"
import type { PyRepo } from "."

export type { CallCandidates }

const writtenName = (name: string): string => name.slice(name.lastIndexOf(".") + 1)

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

const WHOLE: Range = { start: { line: 1, column: 0 }, end: { line: Number.MAX_SAFE_INTEGER, column: 0 } }

export const refFor = (file: string, local: LocalDecl): CodeRef => ({
  file,
  name: local.name,
  definedAt: local.definedAt,
  enclosingRange: local.enclosingRange,
})

export interface Resolver {
  treeOf: (file: string) => Promise<Tree | null>
  resolveModule: (fromFile: string, module: string, level: number, imported: string) => Promise<string | null>
  declarationsOf: (file: string) => Promise<CodeRef[]>
  localNamesFor: (file: string, target: CodeRef) => Promise<CallSearch[]>
  callSitesOf: (file: string, name: string) => Promise<CallSite[]>
}

export function pythonResolver(repo: PyRepo): Resolver {
  const trees = repo.trees ?? treeCache()
  const treeOf = async (file: string): Promise<Tree | null> => trees.treeOf(file, repo.read)

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
    const named = reExportsOf(tree).filter((one) => one.exported === name)
    return someInSequence(named, async (one) => {
      const to = await resolveModuleFor(file, one.module, one.level, one.imported)
      return to !== null && initReaches(to, one.imported, target, next)
    })
  }

  const bindingReaches = async (
    fromFile: string,
    binding: { module: string, level: number, imported: string },
    target: CodeRef,
  ): Promise<{ file: string, isModuleRef: boolean } | null> => {
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

  const localNamesFor = async (file: string, target: CodeRef): Promise<CallSearch[]> => {
    const tree = await treeOf(file)
    if (tree === null) return []
    const written = writtenName(target.name)
    const own: CallSearch[] = file === target.file ? [{ name: written, receiver: null }] : []
    const imported = await Promise.all(
      importBindingsOf(tree)
        .filter((binding) => !binding.typeOnly)
        .map(async (binding): Promise<CallSearch[]> => {
          const reached = await bindingReaches(file, binding, target)
          if (reached === null) return []
          return [reached.isModuleRef ? { name: written, receiver: binding.local } : { name: binding.local, receiver: null }]
        }),
    )
    return [...own, ...imported.flat()]
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
