import { targetNamesIn } from "@/ast-graph/languages/python/patterns"
import type { SyntaxCursor, SyntaxNode } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import { catalogueOfMemberRun, memberNamed, pathBelow, type FileNaming, type NamedBlock } from "@/code-blocks/languages/typescript/named-by"
import { blockIdOf, named, nodeAtRange, startOf } from "@/code-blocks/languages/typescript/syntax"
import type { FindExport, ReadBlock } from "@/code-blocks/reading"
import { compareRanges, rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockCatalogue, CodeBlockType, Position, SourceRange } from "@/code-blocks/types"
import { groupBy } from "@/shared/group-by"
import { annotatedTypeFilling, callFilledByAnnotatedType, isAnnotated } from "./annotated"
import { attributeOfReceiver, keyPathIn, keyScopeWithin, listAttributeNames, NO_KEY_SCOPE, type KeyScope } from "./members"
import { namesOutside, resolutionAt, type PythonOutline } from "./outline"
import { isPlainValue } from "./plain-values"
import { isReturnedFunction } from "./returned-functions"

export interface PythonBlockReader {
  readonly filePath: string
  readonly outline: PythonOutline
  readonly naming: FileNaming
  readonly findExport: FindExport
}

interface WalkContext {
  readonly parentId: string | null
  readonly takenIds: readonly string[]
  readonly className: string | null
  readonly isInRootClass: boolean
  readonly keyScope: KeyScope
}

interface Seed {
  readonly type: CodeBlockType
  readonly name?: string
  readonly range: SourceRange
  readonly declaredAt: readonly Position[]
  readonly isPlain?: boolean
  readonly isReturned?: boolean
  readonly isAnnotatedAlias?: boolean
  readonly catalogue?: CodeBlockCatalogue
}

type ReadSeeds = (node: SyntaxNode, context: WalkContext, reader: PythonBlockReader) => Seed[]

const MODULE_TYPE = "module"
const FUNCTION_TYPE = "function_definition"
const CLASS_TYPE = "class_definition"
const DECORATED_TYPE = "decorated_definition"
const DECORATOR_TYPE = "decorator"
const CALL_NODE_TYPE = "call"
const AWAIT_TYPE = "await"
const CALLEE_NAME_PATTERN = /^[\w$]+(?:\??\.[\w$#]+)*$/
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
const VARIABLE: CodeBlockType = "variable"
const PROPERTY: CodeBlockType = "property"
const ITERATION_TYPE = "for_statement"
const CALLABLE_NODE_TYPES: ReadonlySet<string> = new Set([FUNCTION_TYPE, FUNCTION_VALUE_TYPE])
const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls"])
const NOTHING_TAKEN: readonly string[] = []
const CALLABLE_BLOCK_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method"])
const FUNCTION_DECLARATION = "function"
const ARGUMENT_DECLARATION = "argument"
const LANGUAGE_FUNCTIONS: ReadonlySet<string> = new Set(["map", "filter", "sorted", "min", "max", "reduce"])
const LANGUAGE_METHODS: ReadonlySet<string> = new Set(["map", "filter", "reduce", "sort"])
const LISTENING_METHODS: ReadonlySet<string> = new Set(["add_event_listener", "on", "once", "add_listener", "subscribe"])
const FIRST_SLOT = 0
const EVENT_NAME_PREFIX = "on_"
const TYPE_BASES: ReadonlySet<string> = new Set(["TypedDict", "Protocol"])
const SUBSCRIPT_TYPE = "subscript"
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

const START: WalkContext = { parentId: null, takenIds: [], className: null, isInRootClass: false, keyScope: NO_KEY_SCOPE }

const isAtRoot = (context: WalkContext): boolean => context.parentId === null

const seedAt = (node: SyntaxNode, type: CodeBlockType, name: string | null = null): Seed => ({ type, ...named(name), range: rangeOfNode(node), declaredAt: [] })

const catalogued = (catalogue: CodeBlockCatalogue | null | undefined): { catalogue?: CodeBlockCatalogue } =>
  catalogue === null || catalogue === undefined ? {} : { catalogue }

const plainMarkOf = (value: SyntaxNode | null): Pick<Seed, "isPlain"> => (isPlainValue(value) ? { isPlain: true } : {})

const aliasMarkOf = (value: SyntaxNode | null): Pick<Seed, "isAnnotatedAlias"> => (isAnnotated(value) ? { isAnnotatedAlias: true } : {})

const returnedMarkOf = (callable: SyntaxNode, name: string | null): Pick<Seed, "isReturned"> => (isReturnedFunction(callable, name) ? { isReturned: true } : {})

const decoratedOf = (definition: SyntaxNode): SyntaxNode => (definition.parent?.type === DECORATED_TYPE ? definition.parent : definition)

const decoratorsOf = (definition: SyntaxNode): SyntaxNode[] => decoratedOf(definition).namedChildren.filter((child) => child.type === DECORATOR_TYPE)

const firstNamed = (nodes: readonly SyntaxNode[], { naming }: PythonBlockReader): NamedBlock | null =>
  nodes.map((node) => naming.blockAt(node)).find((found) => found !== null) ?? null

const classAround = (definition: SyntaxNode): SyntaxNode | null => {
  const body = decoratedOf(definition).parent
  return body?.type === BODY_TYPE && body.parent?.type === CLASS_TYPE ? body.parent : null
}

const methodOfDecorators = (definition: SyntaxNode, { naming }: PythonBlockReader): string | null =>
  decoratorsOf(definition).map((decorator) => naming.blockAt(decorator)?.catalogue.method ?? null).find((method) => method !== null) ?? null

const catalogueOfFunction = (definition: SyntaxNode, reader: PythonBlockReader): CodeBlockCatalogue | null => {
  const holder = classAround(definition)
  const decorated = firstNamed(decoratorsOf(definition), reader)
  if (decorated !== null) {
    const prefix = holder === null ? null : (firstNamed(decoratorsOf(holder), reader)?.prefix ?? null)
    return { ...decorated.catalogue, path: pathBelow(prefix, decorated.catalogue.path), method: decorated.catalogue.method ?? methodOfDecorators(definition, reader) }
  }
  const extended = holder === null ? null : reader.naming.blockAt(holder)
  const ownName = definition.childForFieldName("name")?.text ?? null
  const run = extended === null || ownName === null ? null : memberNamed(extended, ownName)
  return extended === null || run === null ? null : catalogueOfMemberRun(extended.catalogue, run)
}

const readFunction: ReadSeeds = (definition, context, reader) => {
  const name = definition.childForFieldName("name")
  if (name === null) return []
  const range = rangeOfNode(decoratedOf(definition))
  const found = catalogued(catalogueOfFunction(definition, reader))
  const holder = classAround(definition)
  if (isTypeClass(holder)) return []
  if (holder !== null) return [{ type: "method", name: [context.className ?? "", name.text].join(MEMBER_SEPARATOR), range, declaredAt: [startOf(name)], ...found }]
  return [{ type: "function", name: name.text, range, declaredAt: [startOf(name)], ...found, ...returnedMarkOf(definition, name.text) }]
}

const baseNameOf = (base: SyntaxNode): string | null => {
  if (base.type === NAME_TYPE) return base.text
  if (base.type === MEMBER_TYPE) return base.childForFieldName("attribute")?.text ?? null
  const subscripted = base.type === SUBSCRIPT_TYPE ? base.childForFieldName("value") : null
  return subscripted === null ? null : baseNameOf(subscripted)
}

const isTypeClass = (definition: SyntaxNode | null): boolean =>
  (definition?.childForFieldName("superclasses")?.namedChildren ?? []).some((base) => TYPE_BASES.has(baseNameOf(base) ?? ""))

const readClass: ReadSeeds = (definition, _context, reader) => {
  const name = definition.childForFieldName("name")
  if (name === null) return []
  if (isTypeClass(definition)) return [{ type: "type-declaration", name: name.text, range: rangeOfNode(decoratedOf(definition)), declaredAt: [startOf(name)] }]
  return [{ type: "class", name: name.text, range: rangeOfNode(decoratedOf(definition)), declaredAt: [startOf(name)], ...catalogued(reader.naming.blockAt(definition)?.catalogue) }]
}

const isClassAttribute = (assignment: SyntaxNode): boolean => {
  const body = assignment.parent?.parent
  return body?.type === BODY_TYPE && body.parent?.type === CLASS_TYPE
}

const memberNameOf = (name: string, { className }: WalkContext): string => (className === null ? name : [className, name].join(MEMBER_SEPARATOR))

const isDeclaredAttribute = (attribute: SyntaxNode): boolean =>
  listAttributeNames(attribute.closest(CLASS_TYPE)).some((declared) => declared.id === attribute.id)

const readPair: ReadSeeds = (pair, { keyScope }) => {
  const keys = keyPathIn(pair, keyScope)
  const isHoldingValue = keys.length > 0 && pair.childForFieldName("value")?.type !== FUNCTION_VALUE_TYPE
  return isHoldingValue ? [seedAt(pair, "property", keys[keys.length - 1])] : []
}

const keepsBlock = (value: SyntaxNode, { naming }: PythonBlockReader): boolean => {
  const said = naming.blockAt(value)
  return said !== null && said.type !== null
}

const readAssignment: ReadSeeds = (assignment, context, reader) => {
  const target = assignment.childForFieldName("left")
  const value = assignment.childForFieldName("right")
  const statement = assignment.parent
  if (target === null || statement?.type !== STATEMENT_TYPE) return []
  const names = targetNamesIn(target)
  const declared = { ...named(names.length === 0 ? null : names[0].text), range: rangeOfNode(statement), declaredAt: names.map(startOf) }
  const attribute = attributeOfReceiver(assignment)
  if (attribute !== null) return isDeclaredAttribute(attribute) ? [{ type: "property", name: memberNameOf(attribute.text, context), range: rangeOfNode(statement), declaredAt: [startOf(attribute)] }] : []
  if (isClassAttribute(assignment)) {
    if (isTypeClass(assignment.closest(CLASS_TYPE))) return []
    return value?.type === FUNCTION_VALUE_TYPE || names.length === 0 ? [] : [{ ...declared, name: memberNameOf(names[0].text, context), type: "property" }]
  }
  if (value?.type === FUNCTION_VALUE_TYPE && target.type === NAME_TYPE) return [{ ...declared, type: "function", ...returnedMarkOf(value, target.text) }]
  if (isAtRoot(context)) return [{ ...declared, type: "root-variable", ...plainMarkOf(value), ...aliasMarkOf(value) }]
  if (names.length === 0) return []
  const isKept = value !== null && (keepsBlock(value, reader) || namesOutside(reader.outline, value))
  return [{ ...declared, type: isKept ? "external-value" : "variable" }]
}

const isAssignedFunction = (callable: SyntaxNode): boolean =>
  callable.parent?.type === ASSIGNMENT_TYPE && callable.parent.childForFieldName("left")?.type === NAME_TYPE

const readFunctionValue: ReadSeeds = (callable) => (isAssignedFunction(callable) ? [] : [{ ...seedAt(callable, "function"), ...returnedMarkOf(callable, null) }])

const passedValuesOf = (call: SyntaxNode): SyntaxNode[] => {
  const filling = annotatedTypeFilling(call)
  const written = (call.childForFieldName("arguments")?.namedChildren ?? []).map((argument) =>
    argument.type === NAMED_ARGUMENT_TYPE ? (argument.childForFieldName("value") ?? argument) : argument)
  return filling === null ? written : [filling, ...written]
}

const leadsToFunction = (name: SyntaxNode, reader: PythonBlockReader): boolean => {
  const resolution = resolutionAt(reader.outline, name)
  if (resolution === null) return false
  if (resolution.kind === "local") return resolution.declaration.type === FUNCTION_DECLARATION && resolution.declaration.declarationType !== ARGUMENT_DECLARATION
  const { importedFilePath, importedName } = resolution.variable
  return importedFilePath !== null && (reader.findExport(importedFilePath, importedName)?.isFunction ?? false)
}

const keywordOf = (passed: SyntaxNode): string | null =>
  passed.parent?.type === NAMED_ARGUMENT_TYPE ? (passed.parent.childForFieldName("name")?.text ?? null) : null

const isCallback = (passed: SyntaxNode, reader: PythonBlockReader): boolean =>
  passed.type === FUNCTION_VALUE_TYPE
  || (passed.type === NAME_TYPE && leadsToFunction(passed, reader))
  || (keywordOf(passed) ?? "").startsWith(EVENT_NAME_PREFIX)
  || reader.naming.slotAt(passed) !== null

const calledNameOf = (call: SyntaxNode): { readonly name: string | null, readonly isMethod: boolean } => {
  const callee = call.childForFieldName("function")
  if (callee?.type === MEMBER_TYPE) return { name: callee.childForFieldName("attribute")?.text ?? null, isMethod: true }
  return { name: callee?.type === NAME_TYPE ? callee.text : null, isMethod: false }
}

const isLanguageCall = (call: SyntaxNode): boolean => {
  const { name, isMethod } = calledNameOf(call)
  return name !== null && (isMethod ? LANGUAGE_METHODS : LANGUAGE_FUNCTIONS).has(name)
}

const typeOfHandedCall = (call: SyntaxNode, reader: PythonBlockReader): CodeBlockType | null => {
  if (isLanguageCall(call) || !passedValuesOf(call).some((passed) => isCallback(passed, reader))) return null
  const { name, isMethod } = calledNameOf(call)
  return isMethod && LISTENING_METHODS.has(name ?? "") ? "code-event" : "effect"
}

const readCall: ReadSeeds = (call, _context, reader) => {
  const said = reader.naming.blockAt(call)
  if (said === null) {
    const handed = typeOfHandedCall(call, reader)
    return handed === null ? [] : [seedAt(call, handed)]
  }
  const isHandedCallbacks = passedValuesOf(call).some((value) => reader.naming.slotAt(value) !== null)
  const type = said.type ?? (isHandedCallbacks ? "effect" : null)
  return type === null ? [] : [{ ...seedAt(call, type), catalogue: said.catalogue }]
}

const nameOfCallee = (called: SyntaxNode): string | null => {
  const callee = called.childForFieldName("function")?.text ?? null
  return callee !== null && CALLEE_NAME_PATTERN.test(callee) ? callee : null
}

const readCallStatement: ReadSeeds = (statement, context, reader) => {
  const [written, ...others] = statement.namedChildren
  const called = written.type === AWAIT_TYPE ? written.firstNamedChild : written
  if (isAtRoot(context) || others.length > 0 || called?.type !== CALL_NODE_TYPE) return []
  return readCall(called, context, reader).length === 0 ? [seedAt(statement, "call", nameOfCallee(called))] : []
}

const slotNameOf = (passed: SyntaxNode): string => {
  if (callFilledByAnnotatedType(passed) !== null) return String(FIRST_SLOT)
  const holder = passed.parent
  if (holder?.type === NAMED_ARGUMENT_TYPE) return holder.childForFieldName("name")?.text ?? ""
  return String(holder?.namedChildren.filter((argument) => argument.type !== NAMED_ARGUMENT_TYPE).findIndex((argument) => argument.id === passed.id) ?? 0)
}

const isPassed = (node: SyntaxNode): boolean => {
  if (callFilledByAnnotatedType(node) !== null) return true
  const holder = node.parent
  if (holder?.type === ARGUMENTS_TYPE) return node.type !== NAMED_ARGUMENT_TYPE && holder.parent?.type === "call"
  return holder?.type === NAMED_ARGUMENT_TYPE && holder.childForFieldName("value")?.id === node.id
}

const callPassedTo = (passed: SyntaxNode): SyntaxNode | null => {
  const filled = callFilledByAnnotatedType(passed)
  if (filled !== null) return filled
  const holder = passed.parent?.type === NAMED_ARGUMENT_TYPE ? passed.parent.parent : passed.parent
  return holder?.type === ARGUMENTS_TYPE && holder.parent?.type === CALL_NODE_TYPE ? holder.parent : null
}

const isHandedToEffect = (passed: SyntaxNode, reader: PythonBlockReader): boolean => {
  const call = callPassedTo(passed)
  return call !== null && reader.naming.blockAt(call) === null && typeOfHandedCall(call, reader) !== null && isCallback(passed, reader)
}

const readPassedCallback: ReadSeeds = (node, _context, reader) => {
  if (!isPassed(node)) return []
  const slot = reader.naming.slotAt(node)
  if (slot !== null) return [{ ...seedAt(node, slot.runs === RUNNING_ON_AN_EVENT ? "code-event" : "effect-callback", slotNameOf(node)), catalogue: slot }]
  if (!isHandedToEffect(node, reader)) return []
  return [seedAt(node, slotNameOf(node).startsWith(EVENT_NAME_PREFIX) ? "code-event" : "effect-callback", slotNameOf(node))]
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
  ["pair", readPair],
  [FUNCTION_VALUE_TYPE, readFunctionValue],
  [STATEMENT_TYPE, readCallStatement],
  [CALL_NODE_TYPE, readCall],
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
  seeds.reduce<ReadBlock[]>((blocks, { type, name, range, declaredAt, isPlain, isReturned, isAnnotatedAlias, catalogue }) => {
    const outer = blocks.length === 0 ? undefined : blocks[blocks.length - 1]
    const takenIds = [...context.takenIds, ...blocks.map((block) => block.id)]
    const block: ReadBlock = {
      id: blockIdOf(filePath, type, range, takenIds),
      ...named(name ?? null),
      type,
      ranges: [range],
      parentId: outer === undefined ? context.parentId : outer.id,
      declaredAt,
      ...(isPlain === true ? { isPlain } : {}),
      ...(isReturned === true ? { isReturned } : {}),
      ...(isAnnotatedAlias === true ? { isAnnotatedAlias } : {}),
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

const isRootCallable = (owner: ReadBlock, context: WalkContext): boolean => owner.parentId === null || context.isInRootClass

const readRootArguments = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext, reader: PythonBlockReader): ReadBlock[] => {
  const owner = blocks.find((block) => CALLABLE_BLOCK_TYPES.has(block.type))
  const parameters = node.type === FUNCTION_TYPE ? node.childForFieldName("parameters") : null
  if (owner === undefined || !isRootCallable(owner, context) || parameters?.type !== PARAMETERS_TYPE) return []
  return parameters.namedChildren
    .filter((parameter, position) => !isReceiver(parameter, position, owner))
    .flatMap((parameter, parameterIndex) => readParameter(parameter, parameterIndex, owner.id, reader))
}

const readBound = (written: SyntaxNode, names: readonly SyntaxNode[], ownerId: string, filePath: string): ReadBlock[] => {
  if (names.length === 0) return []
  const range = rangeOfNode(written)
  return [{ id: blockIdOf(filePath, VARIABLE, range, NOTHING_TAKEN), name: names[0].text, type: VARIABLE, ranges: [range], parentId: ownerId, declaredAt: names.map(startOf), isParameter: true }]
}

const readInnerParameters = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext, reader: PythonBlockReader): ReadBlock[] => {
  const owner = blocks.find((block) => CALLABLE_BLOCK_TYPES.has(block.type))
  const parameters = CALLABLE_NODE_TYPES.has(node.type) ? node.childForFieldName("parameters") : null
  if (owner === undefined || parameters === null || (node.type === FUNCTION_TYPE && isRootCallable(owner, context))) return []
  return parameters.namedChildren
    .filter((parameter, position) => !isReceiver(parameter, position, owner))
    .flatMap((parameter) => {
      const name = nameOfParameter(parameter)
      return readBound(parameter, name === null ? [] : [name], owner.id, reader.filePath)
    })
}

const readIterated = (node: SyntaxNode, blocks: readonly ReadBlock[], reader: PythonBlockReader): ReadBlock[] => {
  const target = node.type === ITERATION_TYPE ? node.childForFieldName("left") : null
  return target === null || blocks.length === 0 ? [] : readBound(target, targetNamesIn(target), blocks[blocks.length - 1].id, reader.filePath)
}

const readBlocksAt = (node: SyntaxNode, context: WalkContext, reader: PythonBlockReader): ReadBlock[] => {
  const keys = keyPathIn(node, context.keyScope)
  const blocks = blocksOf(readSeeds(node, context, reader), context, reader.filePath).map((block) => (block.type === PROPERTY && keys.length > 0 ? { ...block, memberPath: keys } : block))
  return [...blocks, ...readRootArguments(node, blocks, context, reader), ...readInnerParameters(node, blocks, context, reader), ...readIterated(node, blocks, reader)]
}

const contextWithin = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext): WalkContext => {
  const held = blocks.filter((block) => block.argument === undefined && block.isParameter !== true)
  const className = node.type === CLASS_TYPE ? (node.childForFieldName("name")?.text ?? null) : context.className
  const keyScope = keyScopeWithin(node, context.keyScope)
  if (held.length === 0) return { ...context, className, keyScope }
  const innermost = held[held.length - 1]
  return {
    parentId: innermost.id,
    takenIds: [...context.takenIds, ...held.map((block) => block.id)],
    className,
    isInRootClass: innermost.type === "class" && isAtRoot(context),
    keyScope,
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
