import {
  ASTGraphFile,
  parseVue,
  readJsxSyntax,
  readPythonSyntax,
  readTypescriptSyntax,
  readVueSyntax,
  type Declaration,
  type DiffLocation,
  type Encapsulation,
  type FileSyntax,
  type FileVariable,
  type ImportedSymbol,
  type SourceRange,
} from "@/ast-graph"
import { parseWithGrammar, type GrammarId, type SyntaxTree } from "@/ast-graph/parser"

type Columns = readonly [start: number, end: number]
type FilePaths = Readonly<Record<string, string>>

export interface ScriptReading {
  readonly syntaxOf: (source: string, importedFilePaths?: FilePaths) => FileSyntax
  readonly fileOf: (source: string, importedFilePaths?: FilePaths) => ASTGraphFile
  readonly isUsing: (source: string, symbol: ImportedSymbol, importedFilePaths?: FilePaths) => boolean
  readonly usesIn: (source: string, name: string, occurrence?: number) => string[]
  readonly outlineIn: (source: string) => string[]
  readonly variablesIn: (source: string) => string[]
  readonly scopeIn: (source: string, name: string, occurrence?: number) => string
}

const OPENING_MARK = "«"
const CLOSING_MARK = "»"
const NESTING_INDENT = "  "

export const sourceOf = (...lines: readonly string[]): string => lines.join("\n")

export const linesOf = ({ start, end }: SourceRange): string => [start.line, end.line].join("-")

const isBefore = (one: Declaration, two: Declaration): number =>
  one.range.start.line - two.range.start.line || one.range.start.column - two.range.start.column

export const declarationsOf = ({ fileVariables, importVariables }: FileSyntax): Declaration[] => [...fileVariables, ...importVariables].sort(isBefore)

export const declarationOf = (syntax: FileSyntax, name: string, occurrence = 0): Declaration =>
  declarationsOf(syntax).filter((declaration) => declaration.name === name)[occurrence]

export const fileOfSyntax = (syntax: FileSyntax, filePath = "src/checkout.ts"): ASTGraphFile => new ASTGraphFile({ filePath, diffLines: [], syntax })

const NAMESPACE_IMPORT = "*"

export const isUsingImport = (syntax: FileSyntax, { filePath, name }: ImportedSymbol): boolean => {
  const file = fileOfSyntax(syntax)
  return syntax.importVariables
    .filter((variable) => variable.importedFilePath === filePath && (variable.importedName === name || variable.importedName === NAMESPACE_IMPORT))
    .some((variable) => file.traceUsage(variable).length > 0)
}

const marked = (line: string, uses: readonly Columns[]): string =>
  [...uses]
    .sort(([one], [two]) => two - one)
    .reduce((text, [start, end]) => `${text.slice(0, start)}${OPENING_MARK}${text.slice(start, end)}${CLOSING_MARK}${text.slice(end)}`, line)

export const usesOf = (syntax: FileSyntax, source: string, name: string, occurrence = 0): string[] => {
  const ranges = fileOfSyntax(syntax).traceUsage(declarationOf(syntax, name, occurrence)).map((usage) => usage.range)
  const lines = source.split("\n")
  return [...new Set(ranges.map((range) => range.start.line))].map((line) => {
    const uses = ranges.filter((range) => range.start.line === line).map((range): Columns => [range.start.column, range.end.column])
    return marked(lines[line - 1], uses).trim()
  })
}

export const outlineOf = (encapsulations: readonly Encapsulation[], indent = ""): string[] =>
  encapsulations.flatMap(({ kind, name, range, encapsulations: nested }) => [
    `${indent}${kind} ${name} ${linesOf(range)}`,
    ...outlineOf(nested, `${indent}${NESTING_INDENT}`),
  ])

export const describeVariable = ({ name, declarationType, type, spaces }: FileVariable): string =>
  `${name}: ${declarationType} ${type} ${spaces.join("+")}`

export const describeDiffLocation = ({ diffLoC, rootEncapsulation, parentEncapsulation }: DiffLocation): string =>
  `${diffLoC.join("-")} ${rootEncapsulation.name} > ${parentEncapsulation.name}`

type ReadSyntax = (source: string, importedFilePaths: ReadonlyMap<string, string>) => FileSyntax

type ReadTreeSyntax = (tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>) => FileSyntax

const parsedWith = (grammar: GrammarId, readSyntax: ReadTreeSyntax): ReadSyntax => (source, importedFilePaths) => readSyntax(parseWithGrammar(grammar, source), importedFilePaths)

const readingOf = (readSyntax: ReadSyntax): ScriptReading => {
  const syntaxOf = (source: string, importedFilePaths: FilePaths = {}): FileSyntax => readSyntax(source, new Map(Object.entries(importedFilePaths)))
  return {
    syntaxOf,
    fileOf: (source, importedFilePaths) => fileOfSyntax(syntaxOf(source, importedFilePaths)),
    isUsing: (source, symbol, importedFilePaths) => isUsingImport(syntaxOf(source, importedFilePaths), symbol),
    usesIn: (source, name, occurrence) => usesOf(syntaxOf(source), source, name, occurrence),
    outlineIn: (source) => outlineOf(syntaxOf(source).rootEncapsulations),
    variablesIn: (source) => syntaxOf(source).fileVariables.map(describeVariable),
    scopeIn: (source, name, occurrence) => linesOf(declarationOf(syntaxOf(source), name, occurrence).scope),
  }
}

export const TYPESCRIPT_READING = readingOf(parsedWith("typescript", readTypescriptSyntax))

export const JSX_READING = readingOf(parsedWith("tsx", readJsxSyntax))

export const PYTHON_READING = readingOf(parsedWith("python", readPythonSyntax))

export const VUE_READING = readingOf((source, importedFilePaths) => readVueSyntax(parseVue(source), importedFilePaths))

export const SCRIPT_DIALECTS = [
  ["a TypeScript file", TYPESCRIPT_READING],
  ["a JSX file", JSX_READING],
] as const
