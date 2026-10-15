import { parseWithGrammar, type GrammarId, type SyntaxNode } from "@/ast-graph/parser"
import type { FindExportedBinding } from "@/catalogue/matching/syntax-reader"
import { outlineFile } from "./languages"
import type { FindExport } from "./reading"
import { compareRanges, isBefore } from "./source-range"
import type { StoredCodeBlock } from "./stored-types"
import type { CodeBlockDiff, CodeBlockType, SourceRange } from "./types"

export interface PatchDiff extends CodeBlockDiff {
  readonly removedLines?: readonly string[]
}

export interface DeletedCode {
  readonly block: StoredCodeBlock
  readonly diff: PatchDiff
}

export interface DecoratedCode {
  readonly blockId: string
  readonly diff: PatchDiff
}

type RemovedKind = "broken" | "blank" | "comment" | "declaration" | "statement"

interface RemovedCode {
  readonly kind: RemovedKind
  readonly name: string | null
}

const DELETED: CodeBlockType = "deleted"
const UNTYPED_ROOT_TYPES: readonly CodeBlockType[] = ["file", DELETED]
const CLASS: CodeBlockType = "class"
const LINE_BREAK = "\n"
const DECORATOR_MARK = "@"
const DECORATOR_TYPE = "decorator"
const HOLDER_TYPES = ["class_declaration", "method_definition", "function_definition"]
const BLANK_PATTERN = /^\s*$/
const LEADING_BLANK_PATTERN = /^\s*/
const COMMENT_TYPE = "comment"
const ASSIGNMENT_TYPE = "assignment"
const PYTHON_STATEMENT_TYPE = "expression_statement"
const CLASS_BODY_TYPE = "class_body"
const NAMED_BY_FIELDS: readonly string[] = ["declaration", "definition", "name", "left"]
const NAMED_BY_CHILD_TYPES: ReadonlySet<string> = new Set(["variable_declarator", ASSIGNMENT_TYPE])
const DECLARATION_TYPES: ReadonlySet<string> = new Set([
  "function_declaration",
  "generator_function_declaration",
  "class_declaration",
  "abstract_class_declaration",
  "lexical_declaration",
  "variable_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
  "import_statement",
  "export_statement",
  "method_definition",
  "public_field_definition",
  "decorator",
  "function_definition",
  "class_definition",
  "decorated_definition",
  "import_from_statement",
  "future_import_statement",
  "type_alias_statement",
])
const BROKEN: RemovedCode = { kind: "broken", name: null }
const NO_NAME = { name: null }

const withoutIndentation = (lines: readonly string[]): string[] => {
  const written = lines.filter((line) => !BLANK_PATTERN.test(line))
  const indentation = Math.min(...written.map((line) => LEADING_BLANK_PATTERN.exec(line)?.[0].length ?? 0))
  return lines.map((line) => line.slice(indentation))
}

const isDeclaration = (statement: SyntaxNode): boolean =>
  DECLARATION_TYPES.has(statement.type) || (statement.type === PYTHON_STATEMENT_TYPE && statement.firstNamedChild?.type === ASSIGNMENT_TYPE)

const nameOf = (declared: SyntaxNode): string | null => {
  const byField = NAMED_BY_FIELDS.flatMap((field) => declared.childForFieldName(field) ?? [])
  const byChild = declared.namedChildren.filter((child) => NAMED_BY_CHILD_TYPES.has(child.type))
  const [named] = [...byField, ...byChild]
  if (byField.length + byChild.length === 0) return null
  return named.namedChildCount === 0 ? named.text : nameOf(named)
}

const kindOfStatements = (statements: readonly SyntaxNode[]): RemovedCode => {
  const written = statements.filter((statement) => statement.type !== COMMENT_TYPE)
  if (written.length === 0) return { kind: "comment", ...NO_NAME }
  const declared = written.filter((statement) => statement.type !== DECORATOR_TYPE)
  return declared.length > 0 && written.every(isDeclaration) ? { kind: "declaration", name: nameOf(declared[0]) } : { kind: "statement", ...NO_NAME }
}

const readAlone = (text: string, grammar: GrammarId): RemovedCode => {
  const { rootNode } = parseWithGrammar(grammar, text)
  return rootNode.hasError ? BROKEN : kindOfStatements(rootNode.namedChildren)
}

const readAsClassMembers = (text: string, grammar: GrammarId): RemovedCode => {
  const { rootNode } = parseWithGrammar(grammar, ["class Holder {", text, "}"].join(LINE_BREAK))
  const body = rootNode.hasError ? [] : rootNode.descendantsOfType(CLASS_BODY_TYPE)
  return body.length === 0 ? BROKEN : kindOfStatements(body[0].namedChildren)
}

const readRemoved = (lines: readonly string[], grammar: GrammarId | null, holder: StoredCodeBlock | null): RemovedCode => {
  if (lines.every((line) => BLANK_PATTERN.test(line))) return { kind: "blank", ...NO_NAME }
  if (grammar === null) return BROKEN
  const text = withoutIndentation(lines).join(LINE_BREAK)
  const alone = readAlone(text, grammar)
  return alone.kind === "broken" && holder?.type === CLASS && grammar !== "python" ? readAsClassMembers(text, grammar) : alone
}

const isAround = (range: SourceRange, position: SourceRange["start"]): boolean => isBefore(range.start, position) && isBefore(position, range.end)

const findHolder = (blocks: readonly StoredCodeBlock[], position: SourceRange["start"]): StoredCodeBlock | null => {
  const around = blocks.flatMap((block) => block.lineOfCodeRangeReference.filter((range) => isAround(range, position)).map((range) => ({ block, range })))
  const innermostFirst = [...around].sort((one, two) => compareRanges(two.range, one.range))
  return innermostFirst.length === 0 ? null : innermostFirst[0].block
}

const standsAsBlock = ({ kind }: RemovedCode, holder: StoredCodeBlock | null): boolean =>
  holder === null ? kind !== "broken" : kind === "declaration"

const findNoExport: FindExport = () => null
const findNoBinding: FindExportedBinding = () => null

const typeOfRemovedRoot = (filePath: string, lines: readonly string[]): CodeBlockType | null => {
  const source = withoutIndentation(lines).join(LINE_BREAK)
  const reading = outlineFile({ filePath, source, importedFilePaths: new Map() }).read(findNoExport, findNoBinding)
  return reading.blocks.find((block) => block.parentId === null && !UNTYPED_ROOT_TYPES.includes(block.type))?.type ?? null
}

const deletedBlockAt = (filePath: string, diff: PatchDiff, name: string | null, holder: StoredCodeBlock | null): StoredCodeBlock => {
  const deletedType = holder === null && diff.removedLines !== undefined ? typeOfRemovedRoot(filePath, diff.removedLines) : null
  return {
    id: `${filePath}#${DELETED}@${String(diff.range.start.line)}:${String(diff.range.start.column)}`,
    ...(name === null ? {} : { name }),
    type: DELETED,
    ...(deletedType === null ? {} : { deletedType }),
    lineOfCodeRangeReference: [diff.range],
    parentBlockId: holder?.id ?? null,
    childrenBlockIds: [],
    isRoot: holder === null,
    isExported: false,
    exportedByFilePaths: [],
    lineOfCodeDiffs: [diff.range],
    diffs: [{ type: diff.type, range: diff.range }],
    diffSourceIds: [],
    outerSymbols: [],
    usedByIds: [],
    nextBlockIds: [],
    handedFrom: [],
    filePath,
    catalogue: null,
  }
}

interface DecoratedHolder {
  readonly holding: (text: string) => string
  readonly holderCount: number
}

const BESIDE_A_CLASS: DecoratedHolder = { holding: (text) => [text, "class Holder {}"].join(LINE_BREAK), holderCount: 1 }
const INSIDE_A_CLASS: DecoratedHolder = { holding: (text) => ["class Holder {", text, "member() {}", "}"].join(LINE_BREAK), holderCount: 2 }
const BESIDE_A_FUNCTION: DecoratedHolder = { holding: (text) => [text, "def holder():", "    pass"].join(LINE_BREAK), holderCount: 1 }
const DECORATED_HOLDERS: Readonly<Record<GrammarId, readonly DecoratedHolder[]>> = {
  typescript: [BESIDE_A_CLASS, INSIDE_A_CLASS],
  tsx: [BESIDE_A_CLASS, INSIDE_A_CLASS],
  python: [BESIDE_A_FUNCTION],
  html: [],
}

const decoratesOnly = (text: string, grammar: GrammarId, { holding, holderCount }: DecoratedHolder): boolean => {
  const { rootNode } = parseWithGrammar(grammar, holding(text))
  return !rootNode.hasError && rootNode.descendantsOfType(DECORATOR_TYPE).length > 0 && rootNode.descendantsOfType(HOLDER_TYPES).length === holderCount
}

const isDecoration = (lines: readonly string[], grammar: GrammarId | null): boolean => {
  const written = withoutIndentation(lines).filter((line) => !BLANK_PATTERN.test(line))
  if (grammar === null || written.length === 0 || !written[0].startsWith(DECORATOR_MARK)) return false
  return DECORATED_HOLDERS[grammar].some((holder) => decoratesOnly(written.join(LINE_BREAK), grammar, holder))
}

const findDecorated = (blocks: readonly StoredCodeBlock[], position: SourceRange["start"]): StoredCodeBlock | null => {
  const starting = blocks
    .flatMap((block) => block.lineOfCodeRangeReference.slice(0, 1).map((range) => ({ block, range })))
    .filter(({ range }) => range.start.line === position.line)
  const outermostFirst = [...starting].sort((one, two) => compareRanges(one.range, two.range))
  return outermostFirst.length === 0 ? null : outermostFirst[0].block
}

export const listRemovedDecorations = (grammar: GrammarId | null, blocks: readonly StoredCodeBlock[], diffs: readonly PatchDiff[]): DecoratedCode[] =>
  diffs.flatMap((diff) => {
    const decorated = diff.removedLines !== undefined && isDecoration(diff.removedLines, grammar) ? findDecorated(blocks, diff.range.start) : null
    return decorated === null ? [] : [{ blockId: decorated.id, diff }]
  })

export const listDeletedCode = (filePath: string, grammar: GrammarId | null, blocks: readonly StoredCodeBlock[], diffs: readonly PatchDiff[]): DeletedCode[] =>
  diffs.flatMap((diff) => {
    if (diff.removedLines === undefined || isDecoration(diff.removedLines, grammar)) return []
    const holder = findHolder(blocks, diff.range.start)
    const removed = readRemoved(diff.removedLines, grammar, holder)
    return standsAsBlock(removed, holder) ? [{ block: deletedBlockAt(filePath, diff, removed.name, holder), diff }] : []
  })
