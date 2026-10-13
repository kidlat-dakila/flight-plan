import { contextIdOf, nameOfBlock } from "@flightplan/codegraph"
import {
  CONTEXT_CODE_BLOCK_KINDS,
  CONTEXT_CODE_BLOCKS_FIELD_PATH,
  type CodeBlock,
  type ContextCodeBlock,
  type ContextCodeBlockKind,
  type LineRange,
  type ReviewArtifact,
} from "@flightplan/configurations"

const PATH_SEPARATOR = "."
const USER_SEPARATOR = "#"
const UNNAMED = ""

export const NO_CONTEXT_REQUIRED_MESSAGE
  = "The configuration of this review asks for no description of a context code block. Do not write one, and do not ask the reviewer about it."

export const requiresContextCodeBlocks = (artifact: ReviewArtifact): boolean =>
  artifact.contextCodeBlocks.some((listed) => listed.isRequired)

export const requiredContextKindsOf = (artifact: ReviewArtifact): ContextCodeBlockKind[] =>
  CONTEXT_CODE_BLOCK_KINDS.filter((kind) => artifact.contextCodeBlocks.some((listed) => listed.isRequired && listed.kind === kind))

export const withContextRequirement = (artifact: ReviewArtifact, requiredKinds: readonly ContextCodeBlockKind[]): ReviewArtifact => ({
  ...artifact,
  contextCodeBlocks: artifact.contextCodeBlocks.map((listed) => ({ ...listed, isRequired: requiredKinds.includes(listed.kind) })),
})

export const isContextCodeBlockField = (path: string): boolean =>
  path === CONTEXT_CODE_BLOCKS_FIELD_PATH || path.startsWith(`${CONTEXT_CODE_BLOCKS_FIELD_PATH}${PATH_SEPARATOR}`)

export const isDescriptionOwed = ({ isRequired, description }: ContextCodeBlock): boolean => isRequired && description === null

export const pathOfBlock = (block: CodeBlock): string => block.astGraph.filePath

export const lineRangeOfBlock = ({ lineOfCodeRangeReference: [{ start, end }] }: CodeBlock): LineRange => ({ lineStart: start.line, lineEnd: end.line })

export const placeOfBlock = (block: CodeBlock): string => [pathOfBlock(block), nameOfBlock(block)].join(USER_SEPARATOR)

export const nameOfContext = ({ kind, codeBlock, name }: ContextCodeBlock): string =>
  kind === "codebase" && codeBlock !== null ? nameOfBlock(codeBlock) : (name ?? UNNAMED)

export const contextStubOf = (listed: ContextCodeBlock): unknown => ({
  id: contextIdOf(listed),
  kind: listed.kind,
  path: listed.kind === "codebase" && listed.codeBlock !== null ? pathOfBlock(listed.codeBlock) : null,
  library: listed.specifier,
  name: nameOfContext(listed),
  isRequired: listed.isRequired,
  isDescriptionWritten: listed.description !== null,
})
