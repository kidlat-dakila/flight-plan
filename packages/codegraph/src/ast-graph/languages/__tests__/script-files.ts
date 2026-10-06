import {
  JSXASTGraphFile,
  PythonASTGraphFile,
  TypescriptASTGraphFile,
  VueASTGraphFile,
  type ASTGraphFileInput,
  type BaseASTGraphFile,
  type Declaration,
  type DiffLocation,
  type Encapsulation,
  type FileVariable,
  type SourceRange,
} from "@/ast-graph"
import { parseWithGrammar, type GrammarId } from "@/ast-graph/parser"

type Columns = readonly [start: number, end: number]
type FilePaths = Readonly<Record<string, string>>

export interface ScriptReading {
  readonly fileOf: (source: string, importedFilePaths?: FilePaths) => BaseASTGraphFile
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

export const declarationsOf = (file: BaseASTGraphFile): Declaration[] =>
  [...file.listFileVariables(), ...file.listImportVariables()].sort(isBefore)

export const declarationOf = (file: BaseASTGraphFile, name: string, occurrence = 0): Declaration =>
  declarationsOf(file).filter((declaration) => declaration.name === name)[occurrence]

const marked = (line: string, uses: readonly Columns[]): string =>
  [...uses]
    .sort(([one], [two]) => two - one)
    .reduce((text, [start, end]) => `${text.slice(0, start)}${OPENING_MARK}${text.slice(start, end)}${CLOSING_MARK}${text.slice(end)}`, line)

export const usesOf = (file: BaseASTGraphFile, source: string, name: string, occurrence = 0): string[] => {
  const ranges = file.traceUsage(declarationOf(file, name, occurrence)).map((usage) => usage.range)
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

const readingOf = (grammar: GrammarId, create: (input: ASTGraphFileInput) => BaseASTGraphFile): ScriptReading => {
  const fileOf = (source: string, importedFilePaths: FilePaths = {}): BaseASTGraphFile =>
    create({
      filePath: "src/checkout.ts",
      gitSha: "head-commit",
      tree: parseWithGrammar(grammar, source),
      importedBy: [],
      importsTo: [],
      diffLines: [],
      importedFilePaths: new Map(Object.entries(importedFilePaths)),
    })
  return {
    fileOf,
    usesIn: (source, name, occurrence) => usesOf(fileOf(source), source, name, occurrence),
    outlineIn: (source) => outlineOf(fileOf(source).listRootEncapsulations()),
    variablesIn: (source) => fileOf(source).listFileVariables().map(describeVariable),
    scopeIn: (source, name, occurrence) => linesOf(declarationOf(fileOf(source), name, occurrence).scope),
  }
}

export const TYPESCRIPT_READING = readingOf("typescript", (input) => new TypescriptASTGraphFile(input))

export const JSX_READING = readingOf("tsx", (input) => new JSXASTGraphFile(input))

export const PYTHON_READING = readingOf("python", (input) => new PythonASTGraphFile(input))

export const VUE_READING = readingOf("html", (input) => new VueASTGraphFile(input))

export const SCRIPT_DIALECTS = [
  ["TypescriptASTGraphFile", TYPESCRIPT_READING],
  ["JSXASTGraphFile", JSX_READING],
] as const
