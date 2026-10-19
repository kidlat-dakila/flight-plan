import { fitsGlob } from "@/catalogue/matching/file-patterns"
import type { ImportGraphContext, ImportTracer } from "./import-graph-context"

const FOLDER_SEPARATOR = "/"
const NEGATION = "!"
const ANY_FOLDERS = "**/"

interface IgnoreRule {
  readonly glob: string
  readonly isFolderOnly: boolean
  readonly isNegated: boolean
}

const ruleOf = (pattern: string): IgnoreRule => {
  const isNegated = pattern.startsWith(NEGATION)
  const unnegated = isNegated ? pattern.slice(NEGATION.length) : pattern
  const isFolderOnly = unnegated.endsWith(FOLDER_SEPARATOR)
  const named = isFolderOnly ? unnegated.slice(0, -FOLDER_SEPARATOR.length) : unnegated
  return { glob: named.includes(FOLDER_SEPARATOR) ? named : `${ANY_FOLDERS}${named}`, isFolderOnly, isNegated }
}

const folderPathsOf = (path: string): string[] => {
  const folders = path.split(FOLDER_SEPARATOR).slice(0, -1)
  return folders.map((_folder, position) => folders.slice(0, position + 1).join(FOLDER_SEPARATOR))
}

const fitsRule = (rule: IgnoreRule, path: string): boolean =>
  [...folderPathsOf(path), ...(rule.isFolderOnly ? [] : [path])].some((candidate) => fitsGlob(rule.glob, candidate))

export const isIgnoredPath = (patterns: readonly string[], path: string): boolean =>
  patterns.map(ruleOf).reduce((isIgnored, rule) => (fitsRule(rule, path) ? !rule.isNegated : isIgnored), false)

const keptEntriesOf = <Value>(entries: ReadonlyMap<string, Value>, patterns: readonly string[]): ReadonlyMap<string, Value> =>
  new Map([...entries].filter(([path]) => !isIgnoredPath(patterns, path)))

const withoutIgnoredImporters = (tracer: ImportTracer, patterns: readonly string[]): ImportTracer => ({
  ...tracer,
  importersOf: async (filePaths) =>
    (await tracer.importersOf(filePaths)).map((importers) => importers.filter((importer) => !isIgnoredPath(patterns, importer))),
})

export const withoutIgnoredPaths = (context: ImportGraphContext, patterns: readonly string[]): ImportGraphContext => ({
  ...context,
  diffTypes: keptEntriesOf(context.diffTypes, patterns),
  patches: keptEntriesOf(context.patches, patterns),
  tracerFor: async (commit, language) => withoutIgnoredImporters(await context.tracerFor(commit, language), patterns),
})
