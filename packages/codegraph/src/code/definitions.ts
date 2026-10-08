import type { BlobLinker } from "@/review-view-context"
import type { CodeDefinition, CodeReference } from "@flightplan/configurations"
import { codeLinesIn, definitionIdOf, findSource, rowSpanOf, type HighlightedSource } from "./lines"
import { rangeLabelOf } from "./links"

const LIBRARY_NOTE = "Library. The import is shown and not followed."

const listReferences = (sources: readonly HighlightedSource[]): CodeReference[] => sources.flatMap((highlighted) => highlighted.source.references)

const toCodeDefinition = (sources: readonly HighlightedSource[], reference: CodeReference, blobLinkOf: BlobLinker): CodeDefinition[] => {
  const highlighted = findSource(sources, reference.path)
  const range = { lineStart: reference.lines[0], lineEnd: reference.lines[1] }
  const span = highlighted === null ? null : rowSpanOf(highlighted.source, range)
  if (highlighted === null || span === null) return []
  return [
    {
      pathLabel: reference.path,
      rangeLabel: rangeLabelOf(range),
      lines: codeLinesIn(highlighted, span, null),
      note: reference.isLibrary ? LIBRARY_NOTE : null,
      forgeLink: blobLinkOf(reference.path, range),
    },
  ]
}

export const buildCodeDefinitions = (sources: readonly HighlightedSource[], blobLinkOf: BlobLinker): Record<string, CodeDefinition> =>
  Object.fromEntries(
    listReferences(sources).flatMap((reference) =>
      toCodeDefinition(sources, reference, blobLinkOf).map((definition) => [definitionIdOf(reference), definition] as const)),
  )
