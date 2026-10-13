import { nameOfBlock } from "@flightplan/codegraph"
import { CONTEXT_CODE_BLOCKS_FIELD_PATH, type CodeBlock, type ContextCodeBlock, type LineRange, type ReviewArtifact } from "@flightplan/configurations"

const PATH_SEPARATOR = "."
const USER_SEPARATOR = "#"

export const NO_CONTEXT_REQUIRED_MESSAGE
  = "The configuration of this review asks for no description of a context code block. Do not write one, and do not ask the reviewer about it."

export const requiresContextCodeBlocks = (artifact: ReviewArtifact): boolean =>
  artifact.contextCodeBlocks.some((listed) => listed.isRequired)

export const withContextRequirement = (artifact: ReviewArtifact, isRequired: boolean): ReviewArtifact => ({
  ...artifact,
  contextCodeBlocks: artifact.contextCodeBlocks.map((listed) => ({ ...listed, isRequired })),
})

export const isContextCodeBlockField = (path: string): boolean =>
  path === CONTEXT_CODE_BLOCKS_FIELD_PATH || path.startsWith(`${CONTEXT_CODE_BLOCKS_FIELD_PATH}${PATH_SEPARATOR}`)

export const isDescriptionOwed = ({ isRequired, description }: ContextCodeBlock): boolean => isRequired && description === null

export const pathOfBlock = (block: CodeBlock): string => block.astGraph.filePath

export const lineRangeOfBlock = ({ lineOfCodeRangeReference: [{ start, end }] }: CodeBlock): LineRange => ({ lineStart: start.line, lineEnd: end.line })

export const placeOfBlock = (block: CodeBlock): string => [pathOfBlock(block), nameOfBlock(block)].join(USER_SEPARATOR)

export const contextStubOf = ({ codeBlock, isRequired, description }: ContextCodeBlock): unknown => ({
  id: codeBlock.id,
  path: pathOfBlock(codeBlock),
  name: nameOfBlock(codeBlock),
  type: codeBlock.type,
  isRequired,
  isDescriptionWritten: description !== null,
})
