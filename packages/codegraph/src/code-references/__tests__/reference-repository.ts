import { listASTGraphFiles, type ASTGraphFile, type LineRange } from "@/ast-graph"
import { readCodeGroup, type CodeFileSource } from "@/code-blocks"
import type { SourceRange } from "@/code-blocks/types"

export type Repository = Readonly<Record<string, readonly string[]>>

export type Aliases = Readonly<Record<string, string>>

const DIFF_MARK = " // diff"
const IMPORT_SPECIFIER = /from "(?<specifier>[^"]+)"/gu
const RELATIVE_SPECIFIER = /^\.{1,2}\//u
const RESOLVED_SUFFIXES = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]
const PATH_SEPARATOR = "/"
const PARENT_FOLDER = ".."
const SAME_FOLDER = "."
const NO_ALIASES: Aliases = {}
const FIRST_COLUMN = 1

const withoutMark = (line: string): string => (line.endsWith(DIFF_MARK) ? line.slice(0, -DIFF_MARK.length) : line)

const diffLinesOf = (lines: readonly string[]): LineRange[] =>
  lines.flatMap((line, index): LineRange[] => (line.endsWith(DIFF_MARK) ? [[index + 1, index + 1]] : []))

const joinPath = (folder: readonly string[], specifier: string): string =>
  specifier
    .split(PATH_SEPARATOR)
    .reduce<readonly string[]>((path, part) => {
      if (part === SAME_FOLDER) return path
      return part === PARENT_FOLDER ? path.slice(0, -1) : [...path, part]
    }, folder)
    .join(PATH_SEPARATOR)

const aliasedPath = (specifier: string, aliases: Aliases): string => {
  const prefix = Object.keys(aliases).find((alias) => specifier === alias || specifier.startsWith(alias))
  return prefix === undefined ? specifier : `${aliases[prefix]}${specifier.slice(prefix.length)}`
}

const resolveSpecifier = (filePath: string, specifier: string, repository: Repository, aliases: Aliases): string | null => {
  const base = RELATIVE_SPECIFIER.test(specifier)
    ? joinPath(filePath.split(PATH_SEPARATOR).slice(0, -1), specifier)
    : aliasedPath(specifier, aliases)
  const resolved = RESOLVED_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) => candidate in repository)
  return resolved ?? null
}

const importsOf = (filePath: string, source: string, repository: Repository, aliases: Aliases): Map<string, string> =>
  new Map(
    [...source.matchAll(IMPORT_SPECIFIER)].flatMap((match): [string, string][] => {
      const specifier = match.groups?.specifier ?? ""
      const resolved = resolveSpecifier(filePath, specifier, repository, aliases)
      return resolved === null ? [] : [[specifier, resolved]]
    }),
  )

const diffRangesOf = (lines: readonly string[]): SourceRange[] =>
  lines.flatMap((line, index): SourceRange[] => {
    if (!line.endsWith(DIFF_MARK)) return []
    const text = withoutMark(line)
    const firstColumn = text.length - text.trimStart().length + FIRST_COLUMN
    return [{ start: { line: index + 1, column: firstColumn }, end: { line: index + 1, column: text.trimEnd().length + FIRST_COLUMN } }]
  })

const codeSourcesOf = (repository: Repository, aliases: Aliases): CodeFileSource[] => {
  const importedByPath = new Map(
    Object.entries(repository).map(([filePath, lines]) => [filePath, importsOf(filePath, lines.map(withoutMark).join("\n"), repository, aliases)] as const),
  )
  return Object.entries(repository).map(([filePath, lines]) => ({
    filePath,
    source: lines.map(withoutMark).join("\n"),
    importedFilePaths: importedByPath.get(filePath) ?? new Map<string, string>(),
    importedBy: [...importedByPath].filter(([, imported]) => [...imported.values()].includes(filePath)).map(([importer]) => importer),
    diffs: diffRangesOf(lines).map((range) => ({ type: "modified", range })),
  }))
}

export const astGraphFilesOf = (repository: Repository, aliases: Aliases = NO_ALIASES): readonly ASTGraphFile[] =>
  listASTGraphFiles(
    readCodeGroup(codeSourcesOf(repository, aliases)).readSyntaxByPath(),
    new Map(Object.entries(repository).map(([filePath, lines]) => [filePath, diffLinesOf(lines)] as const)),
  )
