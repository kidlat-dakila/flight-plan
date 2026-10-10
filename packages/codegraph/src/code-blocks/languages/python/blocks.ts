import { targetNamesIn } from "@/ast-graph/languages/python/patterns"
import type { SyntaxCursor, SyntaxNode } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import { memberNamed, pathBelow, type FileNaming, type NamedBlock } from "@/code-blocks/languages/typescript/named-by"
import { blockIdOf, named, nodeAtRange, startOf } from "@/code-blocks/languages/typescript/syntax"
import type { ReadBlock } from "@/code-blocks/reading"
import { compareRanges, rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockCatalogue, CodeBlockType, Position, SourceRange } from "@/code-blocks/types"
import { groupBy } from "@/shared/group-by"
import { namesOutside, type PythonOutline } from "./outline"

export interface PythonBlockReader {
  readonly filePath: string
  readonly outline: PythonOutline
  readonly naming: FileNaming
}

interface WalkContext {
  readonly parentId: string | null
  readonly takenIds: readonly string[]
  readonly className: string | null
  readonly isInRootClass: boolean
}

interface Seed {
  readonly type: CodeBlockType
  readonly name?: string
  readonly range: SourceRange
  readonly declaredAt: readonly Position[]
  readonly catalogue?: CodeBlockCatalogue
}

type ReadSeeds = (node: SyntaxNode, context: WalkContext, reader: PythonBlockReader) => Seed[]

const MODULE_TYPE = "module"
const FUNCTION_TYPE = "function_definition"
const CLASS_TYPE = "class_definition"
const DECORATED_TYPE = "decorated_definition"
const DECORATOR_TYPE = "decorator"
const STATEMENT_TYPE = "expression_statement"
const ASSIGNMENT_TYPE = "assignment"
const BODY_TYPE = "block"
const NAME_TYPE = "identifier"
const MEMBER_TYPE = "attribute"
const TEXT_TYPE = "string"
const FUNCTION_VALUE_TYPE = "lambda"
const ARGUMENTS_TYPE = "argument_list"
const NAMED_ARGUMENT_TYPE = "keyword_argument"
const PARAMETERS_TYPE = "parameters"
const MEMBER_SEPARATOR = "."
const RUNNING_ON_AN_EVENT = "event"
const ARGUMENT: CodeBlockType = "root-argument-value"
const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls"])
const NOTHING_TAKEN: readonly string[] = []
const CALLABLE_BLOCK_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method"])
const BLOCKLESS_ROOT_TYPES: ReadonlySet<string> = new Set([
  "comment",
  "import_statement",
  "import_from_statement",
  "future_import_statement",
  DECORATED_TYPE,
  FUNCTION_TYPE,
  CLASS_TYPE,
  "type_alias_statement",
  "pass_statement",
])

const START: WalkContext = { parentId: null, takenIds: [], className: null, isInRootClass: false }

const isAtRoot = (context: WalkContext): boolean => context.parentId === null

const seedAt = (node: SyntaxNode, type: CodeBlockType, name: string | null = null): Seed => ({ type, ...named(name), range: rangeOfNode(node), declaredAt: [] })

const catalogued = (catalogue: CodeBlockCatalogue | null | undefined): { catalogue?: CodeBlockCatalogue } =>
  catalogue === null || catalogue === undefined ? {} : { catalogue }

const decoratedOf = (definition: SyntaxNode): SyntaxNode => (definition.parent?.type === DECORATED_TYPE ? definition.parent : definition)

const decoratorsOf = (definition: SyntaxNode): SyntaxNode[] => decoratedOf(definition).namedChildren.filter((child) => child.type === DECORATOR_TYPE)

const firstNamed = (nodes: readonly SyntaxNode[], { naming }: PythonBlockReader): NamedBlock | null =>
  nodes.map((node) => naming.blockAt(node)).find((found) => found !== null) ?? null

const classAround = (definition: SyntaxNode): SyntaxNode | null => {
  const body = decoratedOf(definition).parent
  return body?.type === BODY_TYPE && body.parent?.type === CLASS_TYPE ? body.parent : null
}

const catalogueOfFunction = (definition: SyntaxNode, reader: PythonBlockReader): CodeBlockCatalogue | null => {
  const holder = classAround(definition)
  const decorated = firstNamed(decoratorsOf(definition), reader)
  if (decorated !== null) {
    const prefix = holder === null ? null : (firstNamed(decoratorsOf(holder), reader)?.prefix ?? null)
    return { ...decorated.catalogue, path: pathBelow(prefix, decorated.catalogue.path) }
  }
  const extended = holder === null ? null : reader.naming.blockAt(holder)
  const ownName = definition.childForFieldName("name")?.text ?? null
  const run = extended === null || ownName === null ? null : memberNamed(extended, ownName)
  return extended === null || run === null ? null : { ...extended.catalogue, runs: run.runs, method: run.method ?? null }
}

const readFunction: ReadSeeds = (definition, context, reader) => {
  const name = definition.childForFieldName("name")
  if (name === null) return []
  const range = rangeOfNode(decoratedOf(definition))
  const found = catalogued(catalogueOfFunction(definition, reader))
  const holder = classAround(definition)
  if (holder !== null) return [{ type: "method", name: [context.className ?? "", name.text].join(MEMBER_SEPARATOR), range, declaredAt: [startOf(name)], ...found }]
  return [{ type: "function", name: name.text, range, declaredAt: [startOf(name)], ...found }]
}

const readClass: ReadSeeds = (definition, _context, reader) => {
  const name = definition.childForFieldName("name")
  if (name === null) return []
  return [{ type: "class", name: name.text, range: rangeOfNode(decoratedOf(definition)), declaredAt: [startOf(name)], ...catalogued(reader.naming.blockAt(definition)?.catalogue) }]
}

const isClassAttribute = (assignment: SyntaxNode): boolean => {
  const body = assignment.parent?.parent
  return body?.type === BODY_TYPE && body.parent?.type === CLASS_TYPE
}

const keepsBlock = (value: SyntaxNode, { naming }: PythonBlockReader): boolean => {
  const said = naming.blockAt(value)
  return said !== null && said.type !== null
}

const readAssignment: ReadSeeds = (assignment, context, reader) => {
  const target = assignment.childForFieldName("left")
  const value = assignment.childForFieldName("right")
  const statement = assignment.parent
  if (target === null || statement?.type !== STATEMENT_TYPE || isClassAttribute(assignment)) return []
  const names = targetNamesIn(target)
  const declared = { ...named(names.length === 0 ? null : names[0].text), range: rangeOfNode(statement), declaredAt: names.map(startOf) }
  if (value?.type === FUNCTION_VALUE_TYPE && target.type === NAME_TYPE) return [{ ...declared, type: "function" }]
  if (isAtRoot(context)) return [{ ...declared, type: "root-variable" }]
  const isKept = value !== null && (keepsBlock(value, reader) || namesOutside(reader.outline, value))
  return isKept ? [{ ...declared, type: "external-value" }] : []
}

const isAssignedFunction = (callable: SyntaxNode): boolean =>
  callable.parent?.type === ASSIGNMENT_TYPE && callable.parent.childForFieldName("left")?.type === NAME_TYPE

const readFunctionValue: ReadSeeds = (callable) => (isAssignedFunction(callable) ? [] : [seedAt(callable, "function")])

const passedValuesOf = (call: SyntaxNode): SyntaxNode[] =>
  (call.childForFieldName("arguments")?.namedChildren ?? []).map((argument) =>
    argument.type === NAMED_ARGUMENT_TYPE ? (argument.childForFieldName("value") ?? argument) : argument)

const readCall: ReadSeeds = (call, _context, reader) => {
  const said = reader.naming.blockAt(call)
  if (said === null) return []
  const isHandedCallbacks = passedValuesOf(call).some((value) => reader.naming.slotAt(value) !== null)
  const type = said.type ?? (isHandedCallbacks ? "effect" : null)
  return type === null ? [] : [{ ...seedAt(call, type), catalogue: said.catalogue }]
}

const slotNameOf = (passed: SyntaxNode): string => {
  const holder = passed.parent
  if (holder?.type === NAMED_ARGUMENT_TYPE) return holder.childForFieldName("name")?.text ?? ""
  return String(holder?.namedChildren.filter((argument) => argument.type !== NAMED_ARGUMENT_TYPE).findIndex((argument) => argument.id === passed.id) ?? 0)
}

const isPassed = (node: SyntaxNode): boolean => {
  const holder = node.parent
  if (holder?.type === ARGUMENTS_TYPE) return node.type !== NAMED_ARGUMENT_TYPE && holder.parent?.type === "call"
  return holder?.type === NAMED_ARGUMENT_TYPE && holder.childForFieldName("value")?.id === node.id
}

const readPassedCallback: ReadSeeds = (node, _context, reader) => {
  const slot = isPassed(node) ? reader.naming.slotAt(node) : null
  if (slot === null) return []
  return [{ ...seedAt(node, slot.runs === RUNNING_ON_AN_EVENT ? "code-event" : "effect-callback", slotNameOf(node)), catalogue: slot }]
}

const isLooseStatement = (statement: SyntaxNode): boolean => {
  if (BLOCKLESS_ROOT_TYPES.has(statement.type)) return false
  if (statement.type !== STATEMENT_TYPE) return true
  return statement.namedChildren.some((child) => child.type !== ASSIGNMENT_TYPE && child.type !== TEXT_TYPE)
}

const readRootStatement: ReadSeeds = (node, context) =>
  isAtRoot(context) && node.parent?.type === MODULE_TYPE && isLooseStatement(node) ? [seedAt(node, "root-statement")] : []

const readImport: ReadSeeds = (statement, context) => (isAtRoot(context) && statement.parent?.type === MODULE_TYPE ? [seedAt(statement, "import")] : [])

const fixed = (type: CodeBlockType): ReadSeeds => (node) => [seedAt(node, type)]

const READERS: ReadonlyMap<string, ReadSeeds> = new Map<string, ReadSeeds>([
  ["import_statement", readImport],
  ["import_from_statement", readImport],
  ["future_import_statement", readImport],
  [FUNCTION_TYPE, readFunction],
  [CLASS_TYPE, readClass],
  [ASSIGNMENT_TYPE, readAssignment],
  [FUNCTION_VALUE_TYPE, readFunctionValue],
  ["call", readCall],
  ["type_alias_statement", (node) => [seedAt(node, "type-declaration", node.childForFieldName("left")?.text ?? null)]],
  ["if_statement", fixed("condition")],
  ["conditional_expression", fixed("condition")],
  ["match_statement", fixed("switch")],
  ["case_clause", fixed("switch-case")],
  ["for_statement", fixed("loop")],
  ["while_statement", fixed("loop")],
  ["try_statement", fixed("try-catch")],
  ["raise_statement", fixed("throw")],
])

const readSeeds: ReadSeeds = (node, context, reader) => [
  ...readRootStatement(node, context, reader),
  ...readPassedCallback(node, context, reader),
  ...(READERS.get(node.type)?.(node, context, reader) ?? []),
]

const blocksOf = (seeds: readonly Seed[], context: WalkContext, filePath: string): ReadBlock[] =>
  seeds.reduce<ReadBlock[]>((blocks, { type, name, range, declaredAt, catalogue }) => {
    const outer = blocks.length === 0 ? undefined : blocks[blocks.length - 1]
    const takenIds = [...context.takenIds, ...blocks.map((block) => block.id)]
    const block: ReadBlock = {
      id: blockIdOf(filePath, type, range, takenIds),
      ...named(name ?? null),
      type,
      ranges: [range],
      parentId: outer === undefined ? context.parentId : outer.id,
      declaredAt,
      ...(catalogue === undefined ? {} : { catalogue }),
    }
    return [...blocks, block]
  }, [])

const nameOfParameter = (parameter: SyntaxNode): SyntaxNode | null => {
  if (parameter.type === NAME_TYPE) return parameter
  const name = parameter.childForFieldName("name") ?? parameter.firstNamedChild
  if (name === null) return null
  return name.type === NAME_TYPE ? name : nameOfParameter(name)
}

const listMemberReads = (name: SyntaxNode, { outline }: PythonBlockReader): SyntaxNode[] => {
  const declaration = outline.declarations.find((candidate) => isSameRange(candidate.range, rangeOf(name)))
  return outline.resolved
    .filter(({ resolution }) => resolution.kind === "local" && resolution.declaration === declaration)
    .map(({ reference }) => nodeAtRange(outline.tree, reference.range))
    .flatMap((read) => (read.parent?.type === MEMBER_TYPE && read.parent.childForFieldName("object")?.id === read.id ? [read.parent] : []))
}

const readMembers = (name: SyntaxNode, parameterIndex: number, wholeId: string, reader: PythonBlockReader): ReadBlock[] =>
  [...groupBy(listMemberReads(name, reader), (read) => read.childForFieldName("attribute")?.text ?? "")].map(([member, reads]) => {
    const ranges = reads.map(rangeOfNode).sort(compareRanges)
    return {
      id: blockIdOf(reader.filePath, ARGUMENT, ranges[0], NOTHING_TAKEN),
      name: member,
      type: ARGUMENT,
      ranges,
      parentId: wholeId,
      declaredAt: [],
      argument: { parameterIndex, role: "member" },
    }
  })

const readParameter = (parameter: SyntaxNode, parameterIndex: number, ownerId: string, reader: PythonBlockReader): ReadBlock[] => {
  const name = nameOfParameter(parameter)
  if (name === null) return []
  const range = rangeOfNode(parameter)
  const id = blockIdOf(reader.filePath, ARGUMENT, range, NOTHING_TAKEN)
  const whole: ReadBlock = { id, name: name.text, type: ARGUMENT, ranges: [range], parentId: ownerId, declaredAt: [startOf(name)], argument: { parameterIndex, role: "whole" } }
  return [whole, ...readMembers(name, parameterIndex, id, reader)]
}

const isReceiver = (parameter: SyntaxNode, position: number, owner: ReadBlock): boolean =>
  owner.type === "method" && position === 0 && RECEIVER_NAMES.has(nameOfParameter(parameter)?.text ?? "")

const readRootArguments = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext, reader: PythonBlockReader): ReadBlock[] => {
  const owner = blocks.find((block) => CALLABLE_BLOCK_TYPES.has(block.type))
  const isRootCallable = owner !== undefined && (owner.parentId === null || context.isInRootClass)
  const parameters = node.type === FUNCTION_TYPE ? node.childForFieldName("parameters") : null
  if (!isRootCallable || parameters?.type !== PARAMETERS_TYPE) return []
  return parameters.namedChildren
    .filter((parameter, position) => !isReceiver(parameter, position, owner))
    .flatMap((parameter, parameterIndex) => readParameter(parameter, parameterIndex, owner.id, reader))
}

const readBlocksAt = (node: SyntaxNode, context: WalkContext, reader: PythonBlockReader): ReadBlock[] => {
  const blocks = blocksOf(readSeeds(node, context, reader), context, reader.filePath)
  return [...blocks, ...readRootArguments(node, blocks, context, reader)]
}

const contextWithin = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext): WalkContext => {
  const held = blocks.filter((block) => block.argument === undefined)
  const className = node.type === CLASS_TYPE ? (node.childForFieldName("name")?.text ?? null) : context.className
  if (held.length === 0) return { ...context, className }
  const innermost = held[held.length - 1]
  return {
    parentId: innermost.id,
    takenIds: [...context.takenIds, ...held.map((block) => block.id)],
    className,
    isInRootClass: innermost.type === "class" && isAtRoot(context),
  }
}

interface ContextStack {
  readonly context: WalkContext
  readonly below: ContextStack | null
}

function* walkBlocks(cursor: SyntaxCursor, reader: PythonBlockReader): Generator<ReadBlock> {
  for (let contexts: ContextStack = { context: START, below: null }, isArriving = true; ;) {
    const node = cursor.currentNode
    if (isArriving && node.isNamed) {
      const blocks = readBlocksAt(node, contexts.context, reader)
      yield* blocks
      if (cursor.gotoFirstChild()) {
        contexts = { context: contextWithin(node, blocks, contexts.context), below: contexts }
        continue
      }
    }
    if (contexts.below === null) return
    isArriving = cursor.gotoNextSibling()
    if (isArriving) continue
    cursor.gotoParent()
    contexts = contexts.below
  }
}

export const readPythonBlocks = (reader: PythonBlockReader): ReadBlock[] => [...walkBlocks(reader.outline.tree.rootNode.walk(), reader)]
