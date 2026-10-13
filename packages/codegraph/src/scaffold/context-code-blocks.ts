import type { FileCodeReferences } from "@/code-references"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { firstOfEach } from "@/shared/first-of-each"
import type {
  ASTGraph,
  CodeBlock,
  CodeBlockSymbol,
  CodeBlockType,
  CodeReference,
  ContextCodeBlock,
  JourneyFlowDiagram,
  Waypoint,
} from "@flightplan/configurations"

export interface ViewedSegment {
  readonly journey: JourneyFlowDiagram | null
  readonly walkthrough: { readonly files: readonly { readonly waypoints: readonly Waypoint[] }[] }
  readonly codeReferences: readonly FileCodeReferences[]
}

type LibraryName = NonNullable<CodeReference["library"]>

const IMPORT_TYPE: CodeBlockType = "import"
const UNDESCRIBED_TYPES: readonly CodeBlockType[] = [IMPORT_TYPE, "root-statement", "file", "deleted"]
const USED_BLOCK_SYMBOL = "external-block"
const LIBRARY_ID_PREFIX = "library:"
const LANGUAGE_ID_PREFIX = "language:"
const NAME_SEPARATOR = "#"
const UNNAMED = ""

export const libraryContextIdOf = ({ specifier, name }: LibraryName): string => `${LIBRARY_ID_PREFIX}${specifier}${NAME_SEPARATOR}${name}`

export const languageContextIdOf = (name: string): string => `${LANGUAGE_ID_PREFIX}${name}`

export const contextIdOf = ({ kind, codeBlock, specifier, name }: ContextCodeBlock): string => {
  if (kind === "library") return libraryContextIdOf({ specifier: specifier ?? UNNAMED, name: name ?? UNNAMED })
  return kind === "language" ? languageContextIdOf(name ?? UNNAMED) : (codeBlock?.id ?? UNNAMED)
}

const listWaypoints = (waypoints: readonly Waypoint[]): Waypoint[] =>
  waypoints.flatMap((waypoint) => [waypoint, ...listWaypoints(waypoint.children)])

const listViewedGraphs = ({ journey, walkthrough }: ViewedSegment): ASTGraph[] => [
  ...walkthrough.files.flatMap((file) => listWaypoints(file.waypoints)).flatMap((waypoint) => waypoint.codeBlocks.map((block) => block.astGraph)),
  ...listJourneyNodes(journey?.journeyNodes ?? []).map((node) => node.codeBlocks[0].astGraph),
]

const usedBlockOf = (symbol: CodeBlockSymbol): CodeBlock[] => (symbol.type === USED_BLOCK_SYMBOL ? [symbol.codeBlockReference] : [])

const listBlocksOf = (astGraph: ASTGraph): CodeBlock[] => [
  ...astGraph.rootBlocks,
  ...astGraph.codeBlocks.flatMap((block) => block.outerSymbols.flatMap(usedBlockOf)),
]

const isDescribed = (block: CodeBlock): boolean => !UNDESCRIBED_TYPES.includes(block.type)

const firstLineOf = (block: CodeBlock): number => block.lineOfCodeRangeReference[0].start.line

const inReadingOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => one.astGraph.filePath.localeCompare(two.astGraph.filePath) || firstLineOf(one) - firstLineOf(two))

const byId = (one: ContextCodeBlock, two: ContextCodeBlock): number => contextIdOf(one).localeCompare(contextIdOf(two))

const listCodebaseBlocks = (viewedGraphs: readonly ASTGraph[]): ContextCodeBlock[] =>
  inReadingOrder(firstOfEach(viewedGraphs.flatMap(listBlocksOf).filter(isDescribed), (block) => block.id))
    .map((codeBlock) => ({ isRequired: false, kind: "codebase", codeBlock, specifier: null, name: null, description: null }))

const isImportAt = (block: CodeBlock, { path, lines: [startLine, endLine] }: CodeReference): boolean =>
  block.type === IMPORT_TYPE
  && block.astGraph.filePath === path
  && block.lineOfCodeRangeReference.some(({ start, end }) => start.line === startLine && end.line === endLine)

const toLibraryBlock = (reference: CodeReference, library: LibraryName, viewedGraphs: readonly ASTGraph[]): ContextCodeBlock => ({
  isRequired: false,
  kind: "library",
  codeBlock: viewedGraphs.flatMap((astGraph) => astGraph.rootBlocks).find((block) => isImportAt(block, reference)) ?? null,
  specifier: library.specifier,
  name: library.name,
  description: null,
})

const listLibraryBlocks = (segments: readonly ViewedSegment[], viewedGraphs: readonly ASTGraph[]): ContextCodeBlock[] => {
  const named = segments
    .flatMap((segment) => segment.codeReferences.flatMap((file) => file.references))
    .flatMap((reference) => (reference.library === undefined ? [] : [toLibraryBlock(reference, reference.library, viewedGraphs)]))
  return [...firstOfEach(named, contextIdOf)].sort(byId)
}

const listLanguageBlocks = (segments: readonly ViewedSegment[]): ContextCodeBlock[] =>
  [...new Set(segments.flatMap((segment) => segment.codeReferences.flatMap((file) => file.languageReferences.map((reference) => reference.name))))]
    .sort((one, two) => one.localeCompare(two))
    .map((name) => ({ isRequired: false, kind: "language", codeBlock: null, specifier: null, name, description: null }))

export const listContextCodeBlocks = (segments: readonly ViewedSegment[]): ContextCodeBlock[] => {
  const viewedGraphs = [...new Set(segments.flatMap(listViewedGraphs))]
  return [...listCodebaseBlocks(viewedGraphs), ...listLibraryBlocks(segments, viewedGraphs), ...listLanguageBlocks(segments)]
}
