import { firstOfEach } from "@/shared/first-of-each"
import type { DiagramNode } from "./diagram-node"
import type { BaseASTGraphFile } from "./languages/base"
import { positionKey } from "./source-range"
import type { Declaration, Encapsulation, ImportedSymbol, LineRange, SourceRange, Usage } from "./types"

export interface EncapsulationSite {
  readonly file: BaseASTGraphFile
  readonly encapsulation: Encapsulation
}

export interface LooseSite {
  readonly file: BaseASTGraphFile
  readonly lines: LineRange
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

const symbolsOf = (file: BaseASTGraphFile, names: readonly string[]): ImportedSymbol[] =>
  names.map((name) => ({ filePath: file.filePath, name }))

const traceUsages = (files: Files, { file, encapsulation }: EncapsulationSite): FileUsage[] => [
  ...usagesIn(file, file.traceEncapsulationUsage(encapsulation)),
  ...traceImportUsages(files, symbolsOf(file, file.listExportedNames(encapsulation))),
]

const traceDeclarationUsages = (files: Files, file: BaseASTGraphFile, declaration: Declaration): FileUsage[] => [
  ...usagesIn(file, file.traceUsage(declaration)),
  ...traceImportUsages(files, symbolsOf(file, file.listExportedNamesOf(declaration.name))),
]

const callerSiteOf = ({ file, usage }: FileUsage): CallerSite[] =>
  usage.encapsulation === null ? [] : [{ file, encapsulation: usage.encapsulation, usedAt: usage.range }]

const listCallerSites = (usages: readonly FileUsage[], path: ReadonlySet<string>): CallerSite[] => {
  const offPath = usages.flatMap(callerSiteOf).filter((caller) => !path.has(siteKey(caller)))
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

const climbCallers = (files: Files, usages: readonly FileUsage[], path: ReadonlySet<string>): DiagramNode[] =>
  listCallerSites(usages, path).map((caller) => ({ ...climb(files, caller, path), calledAt: caller.usedAt }))

const climb = (files: Files, site: EncapsulationSite, path: ReadonlySet<string>): DiagramNode => {
  const climbed = new Set([...path, siteKey(site)])
  return { ...describeSite(site), callers: climbCallers(files, traceUsages(files, site), climbed) }
}

export const traceDeepUsage = (files: Files, site: EncapsulationSite): DiagramNode => climb(files, site, EMPTY_PATH)

const LINE_DASH = "–"
const LISTED_NAME_SEPARATOR = ", "
const LINE_START_COLUMN = 0

const listDeclarationsIn = ({ file, lines: [startLine, endLine] }: LooseSite): Declaration[] =>
  file.listFileVariables().filter(({ range }) => startLine <= range.start.line && range.end.line <= endLine)

export const isDeclaring = (site: LooseSite): boolean => listDeclarationsIn(site).length > 0

export const looseNameOf = (site: LooseSite): string => {
  const names = [...new Set(listDeclarationsIn(site).map((declaration) => declaration.name))]
  return names.length === 0 ? `Lines ${site.lines.map(String).join(LINE_DASH)}` : names.join(LISTED_NAME_SEPARATOR)
}

const describeLooseSite = (site: LooseSite): Pick<DiagramNode, "id" | "code"> => {
  const [startLine, endLine] = site.lines
  const range = { start: { line: startLine, column: LINE_START_COLUMN }, end: { line: endLine, column: LINE_START_COLUMN } }
  return {
    id: { file: site.file.filePath, line: startLine },
    code: { file: site.file.filePath, name: looseNameOf(site), definedAt: range, enclosingRange: range },
  }
}

export const traceLooseUsage = (files: Files, site: LooseSite): DiagramNode => {
  const usages = listDeclarationsIn(site).flatMap((declaration) => traceDeclarationUsages(files, site.file, declaration))
  return { ...describeLooseSite(site), callers: climbCallers(files, usages, EMPTY_PATH) }
}
