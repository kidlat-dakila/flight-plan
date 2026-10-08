import type { AttributeSite, BaseASTGraphFile, Encapsulation, FileUsage, FirstParameter, ImportedSymbol, KeptSite, SymbolTarget } from "@/ast-graph"
import { isSameRange } from "@/ast-graph/source-range"

type Files = readonly BaseASTGraphFile[]

export interface Component {
  readonly file: BaseASTGraphFile
  readonly root: Encapsulation
}

const KEY_SEPARATOR = ":"
const NOTHING_FOLLOWED: ReadonlySet<string> = new Set()

const symbolKey = ({ filePath, name }: ImportedSymbol): string => [filePath, name].join(KEY_SEPARATOR)

const findExported = (files: Files, symbol: ImportedSymbol, followed: ReadonlySet<string>): Component | null => {
  const file = files.find((candidate) => candidate.filePath === symbol.filePath)
  if (file === undefined || followed.has(symbolKey(symbol))) return null
  const root = file.findExportedEncapsulation(symbol.name)
  if (root !== null) return { file, root }
  const next = new Set([...followed, symbolKey(symbol)])
  return file.listReExportedSymbols(symbol.name).reduce<Component | null>((found, source) => found ?? findExported(files, source, next), null)
}

export const findComponent = (files: Files, file: BaseASTGraphFile, name: SymbolTarget): Component | null => {
  const root = file.findDeclaredRootEncapsulation(name)
  if (root !== null) return { file, root }
  const imported = file.findImportedSymbol(name)
  return imported === null ? null : findExported(files, imported, NOTHING_FOLLOWED)
}

const firstParameterOf = ({ file, root }: Component): FirstParameter | null => {
  const outermost = file.listSyntaxSitesIn(root.range).find((site) => site.kind === "function")
  return outermost?.kind === "function" ? outermost.firstParameter : null
}

const listUsagesOf = (file: BaseASTGraphFile, binding: SymbolTarget): FileUsage[] =>
  file.traceUsage(binding).map((usage) => ({ file, usage }))

const listMembersOf = (holder: FileUsage, property: string): FileUsage[] =>
  holder.file
    .listSyntaxSitesAt(holder.usage.range)
    .flatMap((site) => (site.kind === "member" && site.property === property && isSameRange(site.object, holder.usage.range) ? [site] : []))
    .map((member) => ({ file: holder.file, usage: { ...holder.usage, range: member.range } }))

const findKeeper = ({ file, usage }: FileUsage): KeptSite | null => {
  const keeper = file.listSyntaxSitesAt(usage.range).find((site) => site.kind === "kept" && isSameRange(site.range, usage.range))
  return keeper?.kind === "kept" ? keeper : null
}

const followValue = (used: FileUsage): FileUsage[] => {
  const keeper = findKeeper(used)
  if (keeper?.name == null) return [used]
  return listUsagesOf(used.file, keeper.name).flatMap(followValue)
}

const listPropertyUsages = (holder: FileUsage, property: string): FileUsage[] => {
  const taken = (findKeeper(holder)?.properties ?? [])
    .filter((bound) => bound.property === property)
    .flatMap(({ binding }) => listUsagesOf(holder.file, binding))
  return [...listMembersOf(holder, property), ...taken].flatMap(followValue)
}

export const listPropUsages = (files: Files, holder: BaseASTGraphFile, { elementName, attribute }: AttributeSite): FileUsage[] => {
  const component = elementName === null ? null : findComponent(files, holder, elementName)
  const parameter = component === null ? null : firstParameterOf(component)
  if (component === null || parameter === null) return []
  const { file } = component
  const destructured = parameter.properties
    .filter(({ property }) => property === attribute)
    .flatMap(({ binding }) => listUsagesOf(file, binding))
    .flatMap(followValue)
  const read = parameter.name === null ? [] : listUsagesOf(file, parameter.name).flatMap((used) => listPropertyUsages(used, attribute))
  return [...destructured, ...read]
}
