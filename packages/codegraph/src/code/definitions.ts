import { parseProse } from "@/prose/parse-prose"
import type { BlobLinker } from "@/review-view-context"
import type { CodeBlock, CodeDefinition, CodeReference, ContextCodeBlock } from "@flightplan/configurations"
import { codeLinesIn, definitionIdOf, findSource, rowSpanOf, type HighlightedSource } from "./lines"
import { rangeLabelOf } from "./links"

export interface WrittenContext {
  readonly contextCodeBlocks: readonly ContextCodeBlock[]
  readonly knownLinkIds: ReadonlySet<string>
}

const LIBRARY_NOTE = "Library. The import is shown and not followed."

const listReferences = (sources: readonly HighlightedSource[]): CodeReference[] => sources.flatMap((highlighted) => highlighted.source.references)

export const definitionIdsOfBlock = ({ astGraph, lineOfCodeRangeReference }: CodeBlock): string[] =>
  lineOfCodeRangeReference.map(({ start, end }) => definitionIdOf({ path: astGraph.filePath, lines: [start.line, end.line], isLibrary: false }))

const descriptionByDefinitionId = (contextCodeBlocks: readonly ContextCodeBlock[]): ReadonlyMap<string, string> =>
  new Map(
    contextCodeBlocks.flatMap(({ codeBlock, description }) =>
      description === null ? [] : definitionIdsOfBlock(codeBlock).map((definitionId) => [definitionId, description] as const)),
  )

const toCodeDefinition = (
  sources: readonly HighlightedSource[],
  reference: CodeReference,
  blobLinkOf: BlobLinker,
  description: CodeDefinition["description"],
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

export const buildCodeDefinitions = (
  sources: readonly HighlightedSource[],
  blobLinkOf: BlobLinker,
  { contextCodeBlocks, knownLinkIds }: WrittenContext,
): Record<string, CodeDefinition> => {
  const descriptions = descriptionByDefinitionId(contextCodeBlocks)
  return Object.fromEntries(
    listReferences(sources).flatMap((reference) => {
      const definitionId = definitionIdOf(reference)
      const written = descriptions.get(definitionId)
      const description = written === undefined ? null : parseProse(written, knownLinkIds)
      return toCodeDefinition(sources, reference, blobLinkOf, description).map((definition) => [definitionId, definition] as const)
    }),
  )
}
