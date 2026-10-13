import { parseProse } from "@/prose/parse-prose"
import type { BlobLinker } from "@/review-view-context"
import { contextIdOf, libraryContextIdOf } from "@/scaffold/context-code-blocks"
import type { CodeBlock, CodeDefinition, CodeReference, ContextCodeBlock } from "@flightplan/configurations"
import { codeLinesIn, definitionIdOf, findSource, languageDefinitionIdOf, rowSpanOf, type HighlightedSource } from "./lines"
import { rangeLabelOf } from "./links"

export interface WrittenContext {
  readonly contextCodeBlocks: readonly ContextCodeBlock[]
  readonly knownLinkIds: ReadonlySet<string>
}

type Description = CodeDefinition["description"]

const LIBRARY_NOTE = "Library. The import is shown and not followed."
const LANGUAGE_NOTE = "Assumed to be part of the language: this file does not import or declare it."
const LANGUAGE_LABEL = "Language"

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
): CodeDefinition[] => {
  const highlighted = findSource(sources, reference.path)
  const range = { lineStart: reference.lines[0], lineEnd: reference.lines[1] }
  const span = highlighted === null ? null : rowSpanOf(highlighted.source, range)
  if (highlighted === null || span === null) return []
  return [
    {
      pathLabel: reference.path,
      rangeLabel: rangeLabelOf(range),
      description,
      lines: codeLinesIn(highlighted, span, null),
      note: reference.isLibrary ? LIBRARY_NOTE : null,
      forgeLink: blobLinkOf(reference.path, range),
    },
  ]
}

const toLanguageDefinition = (name: string, description: Description): CodeDefinition => ({
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
  ])
}
