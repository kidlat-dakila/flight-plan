import { TypescriptASTGraphFile, type Declaration, type Encapsulation, type FileVariable, type SourceRange } from "@/ast-graph"
import { parseWithGrammar } from "@/ast-graph/parser"

type Columns = readonly [start: number, end: number]

const OPENING_MARK = "«"
const CLOSING_MARK = "»"
const NESTING_INDENT = "  "

export const sourceOf = (...lines: readonly string[]): string => lines.join("\n")

export const typescriptFileOf = (source: string, importedFilePaths: Readonly<Record<string, string>> = {}): TypescriptASTGraphFile =>
  new TypescriptASTGraphFile({
    filePath: "src/checkout.ts",
    gitSha: "head-commit",
    tree: parseWithGrammar("typescript", source),
    importedBy: [],
    importsTo: [],
    importedFilePaths: new Map(Object.entries(importedFilePaths)),
  })

export const linesOf = ({ start, end }: SourceRange): string => [start.line, end.line].join("-")

const isBefore = (one: Declaration, two: Declaration): number =>
  one.range.start.line - two.range.start.line || one.range.start.column - two.range.start.column

export const declarationsOf = (file: TypescriptASTGraphFile): Declaration[] =>
  [...file.listFileVariables(), ...file.listImportVariables()].sort(isBefore)

export const declarationOf = (file: TypescriptASTGraphFile, name: string, occurrence = 0): Declaration =>
  declarationsOf(file).filter((declaration) => declaration.name === name)[occurrence]

const marked = (line: string, uses: readonly Columns[]): string =>
  [...uses]
    .sort(([one], [two]) => two - one)
    .reduce((text, [start, end]) => `${text.slice(0, start)}${OPENING_MARK}${text.slice(start, end)}${CLOSING_MARK}${text.slice(end)}`, line)

export const usesIn = (source: string, name: string, occurrence = 0): string[] => {
  const file = typescriptFileOf(source)
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

export const outlineIn = (source: string): string[] => outlineOf(typescriptFileOf(source).listRootEncapsulations())

export const describeVariable = ({ name, declarationType, type, spaces }: FileVariable): string =>
  `${name}: ${declarationType} ${type} ${spaces.join("+")}`

export const variablesIn = (source: string): string[] => typescriptFileOf(source).listFileVariables().map(describeVariable)

export const scopeIn = (source: string, name: string, occurrence = 0): string =>
  linesOf(declarationOf(typescriptFileOf(source), name, occurrence).scope)
