import { buildStoredCodeGroupGraph, type CodeFileSource } from "@/code-blocks/build-group"
import { findManifestOf, isManifestPath, readManifest, type PackageManifest } from "@/code-blocks/manifests"
import { positionKey } from "@/code-blocks/source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { SourceRange } from "@/code-blocks/types"

export type FixtureFiles = Readonly<Record<string, string>>

export type FixtureDiffs = Readonly<Record<string, readonly SourceRange[]>>

const SPECIFIER_PATTERN = /(?:from |require\()"(?<specifier>\.[^"]*)"/g
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

const PYTHON_SUFFIX = ".py"
const PYTHON_IMPORT_PATTERN = /^from (?<module>[\w.]+) import (?<names>[\w, ]+)$/gm
const MODULE_SEPARATOR = "."
const NAME_SEPARATOR = ","

const importedFileOf = (module: string, name: string, files: FixtureFiles): string | null => {
  const folder = module.split(MODULE_SEPARATOR).join(FOLDER_SEPARATOR)
  return [`${folder}${PYTHON_SUFFIX}`, `${folder}${FOLDER_SEPARATOR}${name}${PYTHON_SUFFIX}`].find((candidate) => candidate in files) ?? null
}

const pythonImportsOf = (source: string, files: FixtureFiles): ReadonlyMap<string, string> =>
  new Map(
    [...source.matchAll(PYTHON_IMPORT_PATTERN)].flatMap(({ groups }) => {
      const module = groups?.module ?? ""
      return (groups?.names ?? "").split(NAME_SEPARATOR).flatMap((written) => {
        const name = written.trim()
        const imported = importedFileOf(module, name, files)
        return imported === null ? [] : [[`${module}:${name}`, imported] as const]
      })
    }),
  )

const importedFilePathsOf = (filePath: string, files: FixtureFiles): ReadonlyMap<string, string> => {
  if (filePath.endsWith(PYTHON_SUFFIX)) return pythonImportsOf(files[filePath], files)
  const folder = filePath.split(FOLDER_SEPARATOR).slice(0, -1)
  const specifiers = [...files[filePath].matchAll(SPECIFIER_PATTERN)].map((match) => match.groups?.specifier ?? "")
  return new Map(
    specifiers.flatMap((specifier) => {
      const imported = SUFFIXES.map((suffix) => `${joinPath(folder, specifier)}${suffix}`).find((candidate) => candidate in files)
      return imported === undefined ? [] : [[specifier, imported] as const]
    }),
  )
}

const manifestsOf = (files: FixtureFiles): PackageManifest[] =>
  Object.keys(files).filter(isManifestPath).map((manifestPath) => readManifest(manifestPath, files[manifestPath]))

export const sourcesOf = (files: FixtureFiles, diffs: FixtureDiffs = NO_DIFFS): CodeFileSource[] => {
  const manifests = manifestsOf(files)
  const codePaths = Object.keys(files).filter((filePath) => !isManifestPath(filePath))
  const importedByPath = new Map(codePaths.map((filePath) => [filePath, importedFilePathsOf(filePath, files)] as const))
  return codePaths.map((filePath) => {
    const manifest = findManifestOf(filePath, manifests)
    return {
      filePath,
      source: files[filePath],
      importedFilePaths: importedByPath.get(filePath) ?? new Map<string, string>(),
      importedBy: [...importedByPath].filter(([, imported]) => [...imported.values()].includes(filePath)).map(([importer]) => importer),
      diffs: (diffs[filePath] ?? []).map((range) => ({ type: "modified", range })),
      ...(manifest === null ? {} : { manifest }),
    }
  })
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
