import { buildStoredCodeGroupGraph, generateTraceDiagram, linkCodeGroupGraph, listTraceNodes, parseMarkedSource, type CodeFileSource } from "@flightplan/codegraph"
import type { ImportGraphGroup, SourceFile, TraceDiagram, TraceNode } from "@flightplan/configurations"

export type TracedFiles = Readonly<Record<string, string>>

export interface TracedCode {
  readonly traceDiagram: TraceDiagram
  readonly sources: readonly SourceFile[]
  readonly nodeOf: (id: string) => TraceNode
}

const HEAD_COMMIT = "head"
const LINE_BREAK = "\n"
const FOLDER_SEPARATOR = "/"
const SAME_FOLDER = "."
const PARENT_FOLDER = ".."
const CONTEXT_MARK = " "
const FIRST_POSITION = { line: 1, column: 1 }
const SUFFIXES = ["", ".ts", ".tsx", ".vue", "/index.ts"]
const SPECIFIER_PATTERN = /from "(?<specifier>\.[^"]*)"/gu
const LANGUAGE_BY_SUFFIX: Readonly<Record<string, string>> = { ".ts": "typescript", ".tsx": "tsx", ".vue": "vue", ".py": "python" }

export const codeOf = (...lines: readonly string[]): string => lines.join(LINE_BREAK)

const joinPath = (folder: readonly string[], specifier: string): string =>
  specifier
    .split(FOLDER_SEPARATOR)
    .reduce<readonly string[]>((path, part) => {
      if (part === SAME_FOLDER) return path
      return part === PARENT_FOLDER ? path.slice(0, -1) : [...path, part]
    }, folder)
    .join(FOLDER_SEPARATOR)

const importedFilePathsOf = (filePath: string, files: TracedFiles): ReadonlyMap<string, string> => {
  const folder = filePath.split(FOLDER_SEPARATOR).slice(0, -1)
  const specifiers = [...files[filePath].matchAll(SPECIFIER_PATTERN)].map((match) => match.groups?.specifier ?? "")
  return new Map(specifiers.flatMap((specifier) => {
    const imported = SUFFIXES.map((suffix) => `${joinPath(folder, specifier)}${suffix}`).find((candidate) => candidate in files)
    return imported === undefined ? [] : [[specifier, imported] as const]
  }))
}

const wholeFileDiffOf = (text: string): CodeFileSource["diffs"][number] => {
  const lines = text.split(LINE_BREAK)
  return { type: "modified", range: { start: FIRST_POSITION, end: { line: lines.length, column: lines[lines.length - 1].length + 1 } } }
}

const fileSourcesOf = (files: TracedFiles): CodeFileSource[] => {
  const importedByPath = new Map(Object.keys(files).map((filePath) => [filePath, importedFilePathsOf(filePath, files)] as const))
  return Object.keys(files).map((filePath) => ({
    filePath,
    source: files[filePath],
    importedFilePaths: importedByPath.get(filePath) ?? new Map<string, string>(),
    importedBy: [...importedByPath].filter(([, imported]) => [...imported.values()].includes(filePath)).map(([importer]) => importer),
    diffs: [wholeFileDiffOf(files[filePath])],
  }))
}

const importGraphGroupOf = (fileSources: readonly CodeFileSource[]): ImportGraphGroup =>
  fileSources.map(({ filePath, importedBy, importedFilePaths }) => ({
    filePath,
    gitSha: HEAD_COMMIT,
    diffType: null,
    importedBy: [...importedBy],
    importsTo: [...importedFilePaths.values()],
    importedFilePaths,
  }))

const languageOf = (filePath: string): string =>
  Object.entries(LANGUAGE_BY_SUFFIX).find(([suffix]) => filePath.endsWith(suffix))?.[1] ?? "typescript"

const sourceFileOf = (filePath: string, text: string): SourceFile =>
  parseMarkedSource(filePath, languageOf(filePath), text.split(LINE_BREAK).map((line) => `${CONTEXT_MARK}${line}`).join(LINE_BREAK))

const requiredNodeOf = (node: TraceNode): TraceNode => ({ ...node, isRequired: true, children: node.children.map(requiredNodeOf) })

export const traceCode = (files: TracedFiles): TracedCode => {
  const fileSources = fileSourcesOf(files)
  const generated = generateTraceDiagram({ group: linkCodeGroupGraph(buildStoredCodeGroupGraph(fileSources)), importGraphGroup: importGraphGroupOf(fileSources), scope: null })
  if (generated === null) throw new Error("The traced code has no Trace Diagram.")
  const traceDiagram = { ...generated, isRequired: true, traceNodes: generated.traceNodes.map(requiredNodeOf) }
  const nodes = listTraceNodes(traceDiagram.traceNodes)
  const nodeOf = (id: string): TraceNode => {
    const node = nodes.find((candidate) => candidate.id === id)
    if (node === undefined) throw new Error(`The Trace Diagram has no node ${id}, only ${nodes.map((candidate) => candidate.id).join(", ")}.`)
    return node
  }
  return { traceDiagram, sources: Object.keys(files).map((filePath) => sourceFileOf(filePath, files[filePath])), nodeOf }
}
