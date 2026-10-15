import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { BlobLinker } from "@/review-view-context"
import { contextIdOf, libraryContextIdOf } from "@/scaffold/context-code-blocks"
import type { CodeBlock, CodeDefinition, CodeExport, CodeLine, CodeReference, CodeUsage, ContextCodeBlock, TokenLine } from "@flightplan/configurations"
import {
  codeLinesIn,
  columnSpanOf,
  definitionIdOf,
  findSource,
  languageDefinitionIdOf,
  rowSpanOf,
  usageLineKeyOf,
  usagesDefinitionIdOf,
  type HighlightedSource,
} from "./lines"
import { rangeLabelOf } from "./links"

export interface WrittenContext {
  readonly contextCodeBlocks: readonly ContextCodeBlock[]
  readonly knownLinkIds: ReadonlySet<string>
}

type DeclarationDefinition = Extract<CodeDefinition, { kind: "declaration" }>

type UsagesDefinition = Extract<CodeDefinition, { kind: "usages" }>

type UsageFile = UsagesDefinition["files"][number]

type Description = DeclarationDefinition["description"]

const LIBRARY_NOTE = "Library. The import is shown and not followed."
const LANGUAGE_NOTE = "Assumed to be part of the language: this file does not import or declare it."
const LANGUAGE_LABEL = "Language"
const NO_USAGES_LABEL = "No usages"
const NO_IMPORTER_NOTE = "No file imports it."
const NO_TOKENS: TokenLine = []

const isCurrentLine = (line: CodeLine): boolean => line.mark !== "removed"

const listReferences = (sources: readonly HighlightedSource[]): CodeReference[] => sources.flatMap((highlighted) => highlighted.source.references)

export const definitionIdsOfBlock = ({ astGraph, lineOfCodeRangeReference }: CodeBlock): string[] =>
  lineOfCodeRangeReference.map(({ start, end }) => definitionIdOf({ path: astGraph.filePath, lines: [start.line, end.line], isLibrary: false }))

const describedKeysOf = (listed: ContextCodeBlock): string[] =>
  listed.kind === "codebase" && listed.codeBlock !== null ? definitionIdsOfBlock(listed.codeBlock) : [contextIdOf(listed)]

const descriptionByKey = (contextCodeBlocks: readonly ContextCodeBlock[]): ReadonlyMap<string, string> =>
  new Map(
    contextCodeBlocks.flatMap((listed) =>
      listed.description === null ? [] : describedKeysOf(listed).map((key) => [key, listed.description ?? ""] as const)),
  )

const describedKeyOf = (reference: CodeReference): string =>
  reference.library === undefined ? definitionIdOf(reference) : libraryContextIdOf(reference.library)

const toCodeDefinition = (
  sources: readonly HighlightedSource[],
  reference: CodeReference,
  blobLinkOf: BlobLinker,
  description: Description,
): DeclarationDefinition[] => {
  const highlighted = findSource(sources, reference.path)
  const range = { lineStart: reference.lines[0], lineEnd: reference.lines[1] }
  const span = highlighted === null ? null : rowSpanOf(highlighted.source, range)
  if (highlighted === null || span === null) return []
  return [
    {
      kind: "declaration",
      pathLabel: reference.path,
      rangeLabel: rangeLabelOf(range),
      description,
      lines: codeLinesIn(highlighted, span, null).filter(isCurrentLine),
      note: reference.isLibrary ? LIBRARY_NOTE : null,
      forgeLink: blobLinkOf(reference.path, range),
    },
  ]
}

const toLanguageDefinition = (name: string, description: Description): DeclarationDefinition => ({
  kind: "declaration",
  pathLabel: name,
  rangeLabel: LANGUAGE_LABEL,
  description,
  lines: [],
  note: LANGUAGE_NOTE,
  forgeLink: null,
})

const listLanguageDefinitions = ({ contextCodeBlocks, knownLinkIds }: WrittenContext): (readonly [string, CodeDefinition])[] =>
  contextCodeBlocks.flatMap(({ kind, name, description }) =>
    kind === "language" && name !== null && description !== null
      ? [[languageDefinitionIdOf(name), toLanguageDefinition(name, parseProse(description, knownLinkIds))] as const]
      : [])

const groupedBy = <Item>(items: readonly Item[], keyOf: (item: Item) => string): Item[][] =>
  [...new Set(items.map(keyOf))].map((key) => items.filter((item) => keyOf(item) === key))

const toUsageLine = (usages: readonly CodeUsage[], usageTokenLines: HighlightedSource["usageTokenLines"]): CodeLine => ({
  numberLabel: String(usages[0].line),
  removedNumberLabel: "",
  mark: "context",
  isFocused: false,
  tokens: [...(usageTokenLines.get(usageLineKeyOf(usages[0])) ?? NO_TOKENS)],
  marks: usages.map(columnSpanOf),
  references: [],
})

const toUsageFile = (usages: readonly CodeUsage[], usageTokenLines: HighlightedSource["usageTokenLines"], blobLinkOf: BlobLinker): UsageFile => ({
  pathLabel: usages[0].path,
  lines: groupedBy(usages, (usage) => String(usage.line)).map((onLine) => toUsageLine(onLine, usageTokenLines)),
  forgeLink: blobLinkOf(usages[0].path, { lineStart: usages[0].line, lineEnd: usages[0].line }),
})

const usageCountLabelOf = (usages: readonly CodeUsage[], fileCount: number): string =>
  usages.length === 0 ? NO_USAGES_LABEL : `${countLabel(usages.length, "usage", "usages")} in ${countLabel(fileCount, "file", "files")}`

const nameOf = ({ source }: HighlightedSource, { line, startColumn, endColumn }: CodeExport): string =>
  source.lines.find((sourceLine) => sourceLine.number === line)?.text.slice(startColumn, endColumn) ?? ""

const toUsagesDefinition = (highlighted: HighlightedSource, exported: CodeExport, blobLinkOf: BlobLinker): UsagesDefinition => {
  const files = groupedBy(exported.usages, (usage) => usage.path).map((inFile) => toUsageFile(inFile, highlighted.usageTokenLines, blobLinkOf))
  return {
    kind: "usages",
    nameLabel: nameOf(highlighted, exported),
    countLabel: usageCountLabelOf(exported.usages, files.length),
    files,
    note: exported.usages.length === 0 ? NO_IMPORTER_NOTE : null,
  }
}

const listUsagesDefinitions = (sources: readonly HighlightedSource[], blobLinkOf: BlobLinker): (readonly [string, CodeDefinition])[] =>
  sources.flatMap((highlighted) =>
    highlighted.source.exports.map((exported) =>
      [usagesDefinitionIdOf(highlighted.source.path, exported.lines), toUsagesDefinition(highlighted, exported, blobLinkOf)] as const))

export const buildCodeDefinitions = (
  sources: readonly HighlightedSource[],
  blobLinkOf: BlobLinker,
  written: WrittenContext,
): Record<string, CodeDefinition> => {
  const descriptions = descriptionByKey(written.contextCodeBlocks)
  return Object.fromEntries([
    ...listReferences(sources).flatMap((reference) => {
      const text = descriptions.get(describedKeyOf(reference))
      const description = text === undefined ? null : parseProse(text, written.knownLinkIds)
      return toCodeDefinition(sources, reference, blobLinkOf, description).map((definition) => [definitionIdOf(reference), definition] as const)
    }),
    ...listLanguageDefinitions(written),
    ...listUsagesDefinitions(sources, blobLinkOf),
  ])
}
