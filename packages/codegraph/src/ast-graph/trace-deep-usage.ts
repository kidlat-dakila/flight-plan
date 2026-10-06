import type { DiagramNode } from "@/core/types"
import type { BaseASTGraphFile } from "./languages/base"
import { positionKey } from "./source-range"
import type { Encapsulation, ImportedSymbol, SourceRange, Usage } from "./types"

export interface EncapsulationSite {
  readonly file: BaseASTGraphFile
  readonly encapsulation: Encapsulation
}

interface FileUsage {
  readonly file: BaseASTGraphFile
  readonly usage: Usage
}

interface CallerSite extends EncapsulationSite {
  readonly usedAt: SourceRange
}

type Files = readonly BaseASTGraphFile[]

const KEY_SEPARATOR = ":"
const NAME_SEPARATOR = "."
const EMPTY_PATH: ReadonlySet<string> = new Set()

export const siteKey = ({ file, encapsulation }: EncapsulationSite): string =>
  [file.filePath, positionKey(encapsulation.range.start), encapsulation.name].join(KEY_SEPARATOR)

const symbolKey = ({ filePath, name }: ImportedSymbol): string => [filePath, name].join(KEY_SEPARATOR)

const firstOfEach = <Item>(items: readonly Item[], keyOf: (item: Item) => string): Item[] =>
  [...new Map([...items].reverse().map((item) => [keyOf(item), item] as const)).values()].reverse()

const usagesIn = (file: BaseASTGraphFile, usages: readonly Usage[]): FileUsage[] => usages.map((usage) => ({ file, usage }))

const forwardedSymbolsOf = (files: Files, symbol: ImportedSymbol): ImportedSymbol[] =>
  files.flatMap((file) => file.listForwardedNames(symbol).map((name) => ({ filePath: file.filePath, name })))

const traceForwardedUsages = (files: Files, symbols: readonly ImportedSymbol[], followed: ReadonlySet<string>): FileUsage[] => {
  const unfollowed = firstOfEach(symbols, symbolKey).filter((symbol) => !followed.has(symbolKey(symbol)))
  if (unfollowed.length === 0) return []
  const named = unfollowed.flatMap((symbol) => files.flatMap((file) => usagesIn(file, file.traceNamedImportUsage(symbol))))
  const forwarded = unfollowed.flatMap((symbol) => forwardedSymbolsOf(files, symbol))
  return [...named, ...traceForwardedUsages(files, forwarded, new Set([...followed, ...unfollowed.map(symbolKey)]))]
}

const traceImportUsages = (files: Files, exported: readonly ImportedSymbol[]): FileUsage[] => {
  const direct = exported.flatMap((symbol) => files.flatMap((file) => usagesIn(file, file.traceImportUsage(symbol))))
  const forwarded = exported.flatMap((symbol) => forwardedSymbolsOf(files, symbol))
  return [...direct, ...traceForwardedUsages(files, forwarded, new Set(exported.map(symbolKey)))]
}

const traceUsages = (files: Files, { file, encapsulation }: EncapsulationSite): FileUsage[] => {
  const exported = file.listExportedNames(encapsulation).map((name) => ({ filePath: file.filePath, name }))
  return [...usagesIn(file, file.traceEncapsulationUsage(encapsulation)), ...traceImportUsages(files, exported)]
}

const callerSiteOf = ({ file, usage }: FileUsage): CallerSite[] =>
  usage.encapsulation === null ? [] : [{ file, encapsulation: usage.encapsulation, usedAt: usage.range }]

const listCallerSites = (files: Files, site: EncapsulationSite, path: ReadonlySet<string>): CallerSite[] => {
  const offPath = traceUsages(files, site)
    .flatMap(callerSiteOf)
    .filter((caller) => !path.has(siteKey(caller)))
  return firstOfEach(offPath, siteKey)
}

const describeSite = ({ file, encapsulation }: EncapsulationSite): Pick<DiagramNode, "id" | "code"> => {
  const definedAt = file.findEncapsulationDeclaration(encapsulation)?.range ?? encapsulation.range
  const name = file
    .listEncapsulationPath(encapsulation)
    .map((holder) => holder.name)
    .join(NAME_SEPARATOR)
  return {
    id: { file: file.filePath, line: definedAt.start.line },
    code: { file: file.filePath, name, definedAt, enclosingRange: encapsulation.range },
  }
}

const climb = (files: Files, site: EncapsulationSite, path: ReadonlySet<string>): DiagramNode => {
  const climbed = new Set([...path, siteKey(site)])
  const callers = listCallerSites(files, site, climbed).map((caller) => ({ ...climb(files, caller, climbed), calledAt: caller.usedAt }))
  return { ...describeSite(site), callers }
}

export const traceDeepUsage = (files: Files, site: EncapsulationSite): DiagramNode => climb(files, site, EMPTY_PATH)
