import { buildStoredCodeGroupGraph, type CodeFileSource } from "@/code-blocks/build-group"
import { positionKey } from "@/code-blocks/source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { SourceRange } from "@/code-blocks/types"

export type FixtureFiles = Readonly<Record<string, string>>

export type FixtureDiffs = Readonly<Record<string, readonly SourceRange[]>>

const SPECIFIER_PATTERN = /from "(?<specifier>\.[^"]*)"/g
const FOLDER_SEPARATOR = "/"
const PARENT_FOLDER = ".."
const SAME_FOLDER = "."
const SUFFIXES = ["", ".ts", ".tsx", "/index.ts"]
const INDENT = "  "
const NO_DIFFS: FixtureDiffs = {}

export const codeOf = (...lines: readonly string[]): string => lines.join("\n")

export const rangeAt = (startLine: number, startColumn: number, endLine: number, endColumn: number): SourceRange => ({
  start: { line: startLine, column: startColumn },
  end: { line: endLine, column: endColumn },
})

const joinPath = (folder: readonly string[], specifier: string): string =>
  specifier
    .split(FOLDER_SEPARATOR)
    .reduce<readonly string[]>((path, part) => {
      if (part === SAME_FOLDER) return path
      return part === PARENT_FOLDER ? path.slice(0, -1) : [...path, part]
    }, folder)
    .join(FOLDER_SEPARATOR)

const importedFilePathsOf = (filePath: string, files: FixtureFiles): ReadonlyMap<string, string> => {
  const folder = filePath.split(FOLDER_SEPARATOR).slice(0, -1)
  const specifiers = [...files[filePath].matchAll(SPECIFIER_PATTERN)].map((match) => match.groups?.specifier ?? "")
  return new Map(
    specifiers.flatMap((specifier) => {
      const imported = SUFFIXES.map((suffix) => `${joinPath(folder, specifier)}${suffix}`).find((candidate) => candidate in files)
      return imported === undefined ? [] : [[specifier, imported] as const]
    }),
  )
}

export const sourcesOf = (files: FixtureFiles, diffs: FixtureDiffs = NO_DIFFS): CodeFileSource[] => {
  const importedByPath = new Map(Object.keys(files).map((filePath) => [filePath, importedFilePathsOf(filePath, files)] as const))
  return Object.keys(files).map((filePath) => ({
    filePath,
    source: files[filePath],
    importedFilePaths: importedByPath.get(filePath) ?? new Map<string, string>(),
    importedBy: [...importedByPath].filter(([, imported]) => [...imported.values()].includes(filePath)).map(([importer]) => importer),
    diffs: (diffs[filePath] ?? []).map((range) => ({ type: "modified", range })),
  }))
}

export const groupOf = (files: FixtureFiles, diffs: FixtureDiffs = NO_DIFFS): StoredCodeGroupGraph => buildStoredCodeGroupGraph(sourcesOf(files, diffs))

export const spanOf = ({ start, end }: SourceRange): string => `${positionKey(start)}-${positionKey(end)}`

const labelOf = ({ type, name, lineOfCodeRangeReference }: StoredCodeBlock): string =>
  [type, ...(name === undefined ? [] : [name]), lineOfCodeRangeReference.map(spanOf).join(" ")].join(" ")

const outlineBelow = (parentId: string | null, blocks: readonly StoredCodeBlock[], depth: number): string[] =>
  blocks
    .filter((block) => block.parentBlockId === parentId)
    .flatMap((block) => [`${INDENT.repeat(depth)}${labelOf(block)}`, ...outlineBelow(block.id, blocks, depth + 1)])

export const outlineOf = (group: StoredCodeGroupGraph, filePath: string): string[] =>
  outlineBelow(null, group.codeBlocks.filter((block) => block.filePath === filePath), 0)

export const blockNamed = (group: StoredCodeGroupGraph, type: StoredCodeBlock["type"], name: string): StoredCodeBlock => {
  const block = group.codeBlocks.find((candidate) => candidate.type === type && candidate.name === name)
  if (block === undefined) throw new Error(`There is no ${type} block named ${name}.`)
  return block
}

const targetOf = (symbol: StoredCodeBlockSymbol): string => {
  if (symbol.type === "unopened-import") return `${symbol.specifier}:${symbol.importedName}`
  if (symbol.type === "internal-variable") return spanOf(symbol.lineOfCodeReference)
  return symbol.type === "external-variable" ? `${symbol.filePath}@${spanOf(symbol.lineOfCodeReference)}` : symbol.codeBlockId
}

export const symbolsOf = ({ outerSymbols }: StoredCodeBlock): string[] =>
  outerSymbols.map((symbol) => [symbol.use, symbol.type, targetOf(symbol), ...(symbol.member === undefined ? [] : [symbol.member.path.join(".")])].join(" "))
