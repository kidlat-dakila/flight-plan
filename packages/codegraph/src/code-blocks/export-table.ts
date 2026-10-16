import type { FileExports, FindExport, FoundExport, OutlinedFile, ReadForwardedExport } from "./reading"

export interface ExportTable {
  readonly findExport: FindExport
  readonly listExportedNames: (filePath: string) => string[]
}

interface ExportQuery {
  readonly filePath: string
  readonly exportedName: string
}

const EVERY_NAME = "*"
const DEFAULT_EXPORT = "default"

const isPassingEveryName = ({ exportedName, importedName }: ReadForwardedExport): boolean =>
  exportedName === EVERY_NAME && importedName === EVERY_NAME

const isSameQuery = (one: ExportQuery, two: ExportQuery): boolean =>
  one.filePath === two.filePath && one.exportedName === two.exportedName

const firstFound = <Found>(candidates: readonly (() => Found | null)[]): Found | null =>
  candidates.reduce<Found | null>((found, findNext) => found ?? findNext(), null)

export const createExportTable = (files: readonly OutlinedFile[]): ExportTable => {
  const exportsByPath: ReadonlyMap<string, FileExports> = new Map(files.map((file) => [file.filePath, file.exports] as const))

  const find = (query: ExportQuery, asked: readonly ExportQuery[]): FoundExport | null => {
    const exports = exportsByPath.get(query.filePath)
    if (exports === undefined || asked.some((earlier) => isSameQuery(earlier, query))) return null
    const local = exports.local.find((candidate) => candidate.exportedName === query.exportedName)
    if (local !== undefined) return { filePath: query.filePath, declarationRange: local.declarationRange, isFunction: local.isFunction }
    const followed = [...asked, query]
    const follow = ({ filePath }: ReadForwardedExport, exportedName: string): FoundExport | null =>
      filePath === null ? null : find({ filePath, exportedName }, followed)
    const named = exports.forwarded.find((candidate) => candidate.exportedName === query.exportedName && candidate.importedName !== EVERY_NAME)
    if (named !== undefined) return follow(named, named.importedName)
    if (query.exportedName === DEFAULT_EXPORT) return null
    return firstFound(exports.forwarded.filter(isPassingEveryName).map((forwarded) => () => follow(forwarded, query.exportedName)))
  }

  const listNames = (filePath: string, listed: readonly string[]): string[] => {
    const exports = exportsByPath.get(filePath)
    if (exports === undefined || listed.includes(filePath)) return []
    const passedOn = exports.forwarded
      .filter(isPassingEveryName)
      .flatMap((forwarded) => (forwarded.filePath === null ? [] : listNames(forwarded.filePath, [...listed, filePath])))
      .filter((name) => name !== DEFAULT_EXPORT)
    const named = exports.forwarded.filter((forwarded) => forwarded.exportedName !== EVERY_NAME).map((forwarded) => forwarded.exportedName)
    const local = exports.local.map((exported) => exported.exportedName).filter((name) => name !== EVERY_NAME)
    return [...new Set([...local, ...named, ...passedOn])]
  }

  return {
    findExport: (filePath, exportedName) => find({ filePath, exportedName }, []),
    listExportedNames: (filePath) => listNames(filePath, []),
  }
}
