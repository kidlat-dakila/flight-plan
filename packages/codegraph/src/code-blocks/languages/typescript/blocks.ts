import { moduleExportsHolding } from "@/ast-graph/languages/typescript/exports"
import { isRequireDeclarator } from "@/ast-graph/languages/typescript/imports"
import { bindingNamesIn } from "@/ast-graph/languages/typescript/patterns"
import { isClassValue, isDirective, isFieldOf, isFunctionValue, textOfName } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxCursor, SyntaxNode } from "@/ast-graph/parser"
import type { ReadBlock } from "@/code-blocks/reading"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockCatalogue, CodeBlockType, Position, SourceRange } from "@/code-blocks/types"
import { listParameters, patternOf, readArgumentBlocks } from "./arguments"
import { catalogueOfSlot, findCallbackSlot, typeOfCall, typeOfConstruction, typeOfMember, typeOfSlot, type CallbackSlot, type CallReader, type EffectPlace } from "./calls"
import { isFirstAssignmentOf, memberAssignedIn } from "./class-members"
import { withDecoratorsInside } from "./decorators"
import type { MadeBlock } from "./made-by"
import {
  attributeNameOf,
  elementNameOf,
  FUNCTION_TYPES,
  isArrowBody,
  isClassComponent,
  isActionAttribute,
  isEventName,
  isMarkup,
  isMarkupCondition,
  isMarkupLoop,
  returnedValueOf,
  returnsMarkup,
} from "./markup"
import { catalogueOfMemberRun, memberNamed, pathBelow, type NamedBlock } from "./named-by"
import type { FileOutline } from "./outline"
import { parameterMemberWrittenIn } from "./parameter-writes"
import { isPlainValue } from "./plain-values"
import { isReturnedFunction } from "./returned-functions"
import { blockIdOf, callableTypeOf, named, startOf } from "./syntax"
import { memberPathOf } from "./written-at"

export interface BlockReader extends CallReader {
  readonly filePath: string
  readonly outline: FileOutline
  readonly comesFromOutside: (value: SyntaxNode) => boolean
  readonly findMade: (value: SyntaxNode) => MadeBlock | null
}

type CallableKind = "component" | "hook" | "plain"

interface WalkContext {
  readonly parentId: string | null
  readonly takenIds: readonly string[]
  readonly callableKind: CallableKind | null
  readonly className: string | null
  readonly isRenderedInPlace: boolean
  readonly isInRootClass: boolean
  readonly isInEvent: boolean
}

interface Seed {
  readonly type: CodeBlockType
  readonly name?: string
  readonly range: SourceRange
  readonly declaredAt: readonly Position[]
  readonly isReturned?: boolean
  readonly isPlain?: boolean
  readonly holdsMarkup?: boolean
  readonly catalogue?: CodeBlockCatalogue
}

type ReadSeeds = (node: SyntaxNode, context: WalkContext, reader: BlockReader) => Seed[]

const PROGRAM_TYPE = "program"
const EXPORT_TYPE = "export_statement"
const DECLARATOR_TYPE = "variable_declarator"
const NAME_TYPE = "identifier"
const PAIR_TYPE = "pair"
const FIELD_TYPE = "public_field_definition"
const CLASS_BODY_TYPE = "class_body"
const OPTIONS_TYPE = "object"
const ARGUMENTS_TYPE = "arguments"
const DECORATOR_TYPE = "decorator"
const EXPRESSION_HOLDER_TYPE = "jsx_expression"
const CALL_TYPE = "call_expression"
const MEMBER_TYPE = "member_expression"
const CONSTRUCTION_TYPE = "new_expression"
const DEFAULT_KEYWORD = "default"
const RETURN_TYPE = "return_statement"
const CLASS_EXPRESSION_TYPE = "class"
const DEFAULT_EXPORT = "default"
const MEMBER_SEPARATOR = "."
const AWAITING_TYPES: ReadonlySet<string> = new Set([
  "await_expression",
  "parenthesized_expression",
  "as_expression",
  "satisfies_expression",
  "non_null_expression",
])
const CLASS_TYPES: ReadonlySet<string> = new Set(["class_declaration", "abstract_class_declaration", "class"])
const BLOCKLESS_ROOT_TYPES: ReadonlySet<string> = new Set([
  "comment",
  "hash_bang_line",
  "empty_statement",
  "import_statement",
  EXPORT_TYPE,
  "function_declaration",
  "generator_function_declaration",
  "class_declaration",
  "abstract_class_declaration",
  "lexical_declaration",
  "variable_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "ambient_declaration",
  "enum_declaration",
  "function_signature",
])
const MODULE_WIDE_TYPES: ReadonlySet<string> = new Set(["import_statement", "interface_declaration", "type_alias_declaration"])
const RECEIVER_TYPE = "this"
const STATEMENT_TYPE = "expression_statement"
const MEMBER_BLOCK_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method", "property"])
const AMBIENT_TYPE = "ambient_declaration"
const ITERATION_TYPE = "for_in_statement"
const CATCH_TYPE = "catch_clause"
const CALLEE_NAME_PATTERN = /^[\w$]+(?:\??\.[\w$#]+)*$/
const CALLABLE_BLOCK_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method"])
const COMPONENT_KINDS: ReadonlySet<CallableKind> = new Set<CallableKind>(["component", "hook"])
const MIDDLEWARE_RUNS = "middleware"
const PATH_SEPARATOR = "/"

const START: WalkContext = {
  parentId: null,
  takenIds: [],
  callableKind: null,
  className: null,
  isRenderedInPlace: false,
  isInRootClass: false,
  isInEvent: false,
}

const isAtRoot = (context: WalkContext): boolean => context.parentId === null

const seedAt = (node: SyntaxNode, type: CodeBlockType, name: string | null = null): Seed => ({
  type,
  ...named(name),
  range: rangeOfNode(node),
  declaredAt: [],
})

const plainMarkOf = (value: SyntaxNode | null): Pick<Seed, "isPlain"> => (isPlainValue(value) ? { isPlain: true } : {})

const returnedMarkOf = (callable: SyntaxNode, declaration: SyntaxNode, name: string | null): Pick<Seed, "isReturned"> =>
  isReturnedFunction(callable, declaration, name) ? { isReturned: true } : {}

const exportingStatementOf = (declaration: SyntaxNode): SyntaxNode =>
  declaration.parent?.type === EXPORT_TYPE ? declaration.parent : declaration

const defaultKeywordOf = (statement: SyntaxNode): SyntaxNode | null =>
  statement.children.find((child) => child.type === DEFAULT_KEYWORD) ?? null

const declaredAtName = (declaration: SyntaxNode): Position[] => {
  const name = declaration.childForFieldName("name")
  return name === null ? [] : [startOf(name)]
}

const rangeOfDeclarator = (declarator: SyntaxNode): SourceRange => {
  const declaration = declarator.parent ?? declarator
  const isAlone = declaration.namedChildren.filter((child) => child.type === DECLARATOR_TYPE).length === 1
  return rangeOfNode(isAlone ? exportingStatementOf(declaration) : declarator)
}

const unawaited = (value: SyntaxNode): SyntaxNode => {
  const inner = AWAITING_TYPES.has(value.type) ? value.firstNamedChild : null
  return inner === null ? value : unawaited(inner)
}

const placeOf = (context: WalkContext): EffectPlace =>
  !context.isInEvent && context.callableKind !== null && COMPONENT_KINDS.has(context.callableKind) ? "component" : "elsewhere"

const catalogued = (catalogue: CodeBlockCatalogue | null | undefined): { catalogue?: CodeBlockCatalogue } =>
  catalogue === null || catalogue === undefined ? {} : { catalogue }

const slotSeed = (node: SyntaxNode, slot: CallbackSlot, reader: BlockReader): Seed => ({
  ...seedAt(node, typeOfSlot(slot, reader), slot.name),
  ...catalogued(catalogueOfSlot(slot, reader)),
})

const typeOfWritten = (expression: SyntaxNode, context: WalkContext, reader: BlockReader): CodeBlockType | null => {
  if (expression.type === CALL_TYPE) return isMarkupLoop(expression) ? "render-loop" : typeOfCall(expression, placeOf(context), reader)
  if (expression.type === CONSTRUCTION_TYPE) return typeOfConstruction(expression, reader)
  return expression.type === MEMBER_TYPE ? typeOfMember(expression, reader) : null
}

const typeOfExpression = (expression: SyntaxNode, context: WalkContext, reader: BlockReader): CodeBlockType | null =>
  reader.naming.blockAt(expression)?.type ?? typeOfWritten(expression, context, reader)

const keepsBlock = (value: SyntaxNode, context: WalkContext, reader: BlockReader): boolean =>
  typeOfExpression(unawaited(value), context, reader) !== null

const madeBy = (value: SyntaxNode, reader: BlockReader): MadeBlock | null => {
  const said = reader.naming.blockAt(value)
  const declared = said?.declares ?? null
  return reader.findMade(value) ?? (said === null || declared === null ? null : { type: declared, catalogue: said.catalogue })
}

const typeOfCallable = (callable: SyntaxNode, name: string | null, context: WalkContext): CodeBlockType => {
  const typeByName = callableTypeOf(name)
  if (typeByName === "hook") return typeByName
  return returnsMarkup(callable) && !context.isRenderedInPlace ? "component" : typeByName
}

const typeOfClass = (declared: SyntaxNode): CodeBlockType => (isClassComponent(declared) ? "component" : "class")

const isHeldMarkup = (value: SyntaxNode | null, context: WalkContext): boolean =>
  value !== null && value.parent?.type === DECLARATOR_TYPE && isFieldOf(value, "value") && !context.isRenderedInPlace && isMarkup(value)

const readDeclarator: ReadSeeds = (declarator, context, reader) => {
  const pattern = declarator.childForFieldName("name")
  const value = declarator.childForFieldName("value")
  if (pattern === null) return []
  if (isRequireDeclarator(declarator)) return isAtRoot(context) ? [seedAt(declarator.parent ?? declarator, "import")] : []
  const bindings = bindingNamesIn(pattern)
  const name = bindings.length === 0 ? null : bindings[0].text
  const declared = { ...named(name), range: rangeOfDeclarator(declarator), declaredAt: bindings.map(startOf) }
  if (value !== null && isFunctionValue(value)) return [{ ...declared, type: typeOfCallable(value, name, context), ...returnedMarkOf(value, declarator, name) }]
  if (value !== null && isClassValue(value)) return [{ ...declared, type: typeOfClass(value) }]
  if (isHeldMarkup(value, context)) return [{ ...declared, type: "component", holdsMarkup: true }]
  const made = value === null ? null : madeBy(unawaited(value), reader)
  if (made !== null) return [{ ...declared, ...made }]
  if (isAtRoot(context)) return [{ ...declared, type: "root-variable", ...plainMarkOf(value) }]
  if (declarator.closest(AMBIENT_TYPE) !== null) return []
  const isKept = value !== null && (keepsBlock(value, context, reader) || reader.comesFromOutside(value))
  return [{ ...declared, type: isKept ? "external-value" : "variable" }]
}

const readDeclaredCallable: ReadSeeds = (callable, context) => {
  const name = callable.childForFieldName("name")?.text ?? null
  return [{
    type: typeOfCallable(callable, name, context),
    ...named(name),
    range: rangeOfNode(exportingStatementOf(callable)),
    declaredAt: declaredAtName(callable),
    ...returnedMarkOf(callable, callable, name),
  }]
}

const readDefaultValue = (value: SyntaxNode, type: CodeBlockType): Seed[] => {
  const statement = value.parent ?? value
  const keyword = defaultKeywordOf(statement)
  const name = value.childForFieldName("name")?.text ?? DEFAULT_EXPORT
  return [{ type, name, range: rangeOfNode(statement), declaredAt: keyword === null ? [] : [startOf(keyword)] }]
}

const isOwnedValue = (value: SyntaxNode, ownerTypes: readonly string[]): boolean =>
  value.parent !== null && ownerTypes.includes(value.parent.type) && isFieldOf(value, "value")

const readInlineCallable: ReadSeeds = (callable, context, reader) => {
  const { parent } = callable
  if (parent === null || isOwnedValue(callable, [DECLARATOR_TYPE, FIELD_TYPE])) return []
  if (isOwnedValue(callable, [PAIR_TYPE])) return findCallbackSlot(parent, reader) === null ? [] : [seedAt(callable, typeOfCallable(callable, null, context))]
  if (parent.type === EXPORT_TYPE) return readDefaultValue(callable, typeOfCallable(callable, null, context))
  const name = callable.childForFieldName("name")?.text ?? null
  const moduleExports = moduleExportsHolding(callable)
  return [{
    ...seedAt(callable, typeOfCallable(callable, name, context), name),
    ...(moduleExports === null ? {} : { declaredAt: [startOf(moduleExports)] }),
    ...returnedMarkOf(callable, callable, name),
  }]
}

const firstDecoratorOf = (member: SyntaxNode): SyntaxNode => {
  const previous = member.previousNamedSibling
  return previous?.type === DECORATOR_TYPE ? firstDecoratorOf(previous) : member
}

const memberNameOf = (member: SyntaxNode, { className }: WalkContext): string => {
  const name = member.childForFieldName("name")
  const ownName = name === null ? "" : textOfName(name)
  return className === null ? ownName : [className, ownName].join(MEMBER_SEPARATOR)
}

const decoratorsBefore = (member: SyntaxNode): SyntaxNode[] => {
  const previous = member.previousNamedSibling
  return previous?.type === DECORATOR_TYPE ? [...decoratorsBefore(previous), previous] : []
}

const decoratorsOfClass = (declared: SyntaxNode): SyntaxNode[] => [
  ...decoratorsBefore(declared),
  ...declared.namedChildren.filter((child) => child.type === DECORATOR_TYPE),
]

const tellingFirst = (candidates: readonly NamedBlock[]): NamedBlock[] => [
  ...candidates.filter(({ catalogue }) => catalogue.runs !== null && catalogue.runs !== MIDDLEWARE_RUNS),
  ...candidates.filter(({ catalogue }) => catalogue.runs === null || catalogue.runs === MIDDLEWARE_RUNS),
]

const mostTellingOf = (nodes: readonly SyntaxNode[], reader: BlockReader): NamedBlock | null =>
  tellingFirst(nodes.flatMap((node) => reader.naming.blockAt(node) ?? []))[0] ?? null

const prefixOfClass = (declared: SyntaxNode, reader: BlockReader): string | null =>
  decoratorsOfClass(declared).map((node) => reader.naming.blockAt(node)?.prefix ?? null).find((prefix) => prefix !== null) ?? null

const rootedPath = (path: string | null): string | null => (path === null || path.startsWith(PATH_SEPARATOR) ? path : `${PATH_SEPARATOR}${path}`)

const catalogueOfMember = (member: SyntaxNode, reader: BlockReader): CodeBlockCatalogue | null => {
  const declared = member.parent?.parent ?? null
  const ownName = member.childForFieldName("name")
  const decorated = mostTellingOf(decoratorsBefore(member), reader)
  const prefix = declared === null ? null : prefixOfClass(declared, reader)
  if (decorated !== null) return { ...decorated.catalogue, path: rootedPath(pathBelow(prefix, decorated.catalogue.path)) }
  const extended = declared === null ? null : reader.naming.blockAt(declared)
  const run = extended === null || ownName === null ? null : memberNamed(extended, textOfName(ownName))
  return extended === null || run === null ? null : catalogueOfMemberRun(extended.catalogue, run)
}

const readMethod: ReadSeeds = (method, context, reader) => {
  if (method.parent?.type === CLASS_BODY_TYPE) {
    const range = { start: rangeOfNode(firstDecoratorOf(method)).start, end: rangeOfNode(method).end }
    return [{ type: "method", name: memberNameOf(method, context), range, declaredAt: declaredAtName(method), ...catalogued(catalogueOfMember(method, reader)) }]
  }
  const name = method.childForFieldName("name")?.text ?? null
  const slot = findCallbackSlot(method, reader)
  if (slot === null) return [seedAt(method, typeOfCallable(method, name, context), name)]
  return [slotSeed(method, slot, reader), seedAt(method, typeOfCallable(method, null, context))]
}

const readField: ReadSeeds = (field, context, reader) =>
  isFunctionValue(field.childForFieldName("value"))
    ? [{ ...seedAt(field, "method", memberNameOf(field, context)), declaredAt: declaredAtName(field), ...catalogued(catalogueOfMember(field, reader)) }]
    : [{ ...seedAt(field, "property", memberNameOf(field, context)), declaredAt: declaredAtName(field) }]

const statementAroundWriting = (writing: SyntaxNode): SyntaxNode => (writing.parent?.type === STATEMENT_TYPE ? writing.parent : writing)

const readWrittenParameterMember: ReadSeeds = (writing) => {
  const target = parameterMemberWrittenIn(writing)
  return target === null ? [] : [seedAt(statementAroundWriting(writing), "property", target.text)]
}

const readAssignedMember: ReadSeeds = (assignment, context, reader) => {
  const name = memberAssignedIn(assignment)
  if (name === null) return readWrittenParameterMember(assignment, context, reader)
  if (!isFirstAssignmentOf(name)) return []
  const written = statementAroundWriting(assignment)
  const ownName = textOfName(name)
  return [{ ...seedAt(written, "property", context.className === null ? ownName : [context.className, ownName].join(MEMBER_SEPARATOR)), declaredAt: [startOf(name)] }]
}

const readOption: ReadSeeds = (option, context, reader) => {
  const slot = findCallbackSlot(option, reader)
  if (slot !== null) return [slotSeed(option, slot, reader)]
  const key = option.childForFieldName("key")
  const value = option.type === PAIR_TYPE ? option.childForFieldName("value") : null
  if (option.parent?.type !== OPTIONS_TYPE) return []
  if (key === null || value === null) return [seedAt(option, "property", key === null ? option.text : textOfName(key))]
  if (!isFunctionValue(value)) return [seedAt(option, "property", textOfName(key))]
  const name = textOfName(key)
  return [seedAt(option, typeOfCallable(value, name, context), name)]
}

const readClass: ReadSeeds = (declared, _context, reader) => {
  if (declared.type !== CLASS_EXPRESSION_TYPE) {
    const name = declared.childForFieldName("name")?.text ?? null
    const extended = reader.naming.blockAt(declared)?.catalogue
    return [{ type: typeOfClass(declared), ...named(name), range: rangeOfNode(exportingStatementOf(declared)), declaredAt: declaredAtName(declared), ...catalogued(extended) }]
  }
  if (isOwnedValue(declared, [DECLARATOR_TYPE])) return []
  if (declared.parent?.type === EXPORT_TYPE) return readDefaultValue(declared, typeOfClass(declared))
  return [seedAt(declared, typeOfClass(declared), declared.childForFieldName("name")?.text ?? null)]
}

const readExport: ReadSeeds = (statement) => {
  if (statement.childForFieldName("source") !== null) return [seedAt(statement, "import")]
  if (statement.childForFieldName("declaration") !== null) return []
  const value = statement.childForFieldName("value")
  if (value === null || value.type === NAME_TYPE) return [seedAt(statement, "root-statement")]
  if (isFunctionValue(value) || isClassValue(value)) return []
  return readDefaultValue(value, "root-variable").map((seed) => ({ ...seed, ...plainMarkOf(value) }))
}

const readTypeDeclaration: ReadSeeds = (declaration) => [
  { type: "type-declaration", ...named(declaration.childForFieldName("name")?.text ?? null), range: rangeOfNode(exportingStatementOf(declaration)), declaredAt: declaredAtName(declaration) },
]

const readEnumeration: ReadSeeds = (declaration, context) =>
  isAtRoot(context)
    ? [{
        type: "root-variable",
        ...named(declaration.childForFieldName("name")?.text ?? null),
        range: rangeOfNode(exportingStatementOf(declaration)),
        declaredAt: declaredAtName(declaration),
        ...plainMarkOf(declaration.childForFieldName("body")),
      }]
    : []

const readReturn: ReadSeeds = (statement, context) => {
  const value = returnedValueOf(statement)
  const isRoot = value !== null && context.callableKind !== null && !context.isRenderedInPlace && isMarkup(value)
  return isRoot ? [seedAt(statement, "render-root")] : []
}

const readAttribute: ReadSeeds = (attribute) => {
  const name = attributeNameOf(attribute)
  return name !== null && (isEventName(name) || isActionAttribute(attribute, name)) ? [seedAt(attribute, "render-event", name)] : []
}

const isReturnedValue = (value: SyntaxNode): boolean => {
  const { parent } = value
  if (parent === null) return false
  if (AWAITING_TYPES.has(parent.type)) return isReturnedValue(parent)
  return parent.type === RETURN_TYPE || isArrowBody(value)
}

const readExpression: ReadSeeds = (expression, context, reader) => {
  const type = typeOfExpression(expression, context, reader)
  if (type === null) return []
  const said = reader.naming.blockAt(expression)
  return [{ ...seedAt(expression, type), ...(isReturnedValue(expression) ? { isReturned: true } : {}), ...catalogued(said?.catalogue) }]
}

const nameOfCallee = (called: SyntaxNode): string | null => {
  const callee = called.childForFieldName("function")?.text ?? null
  return callee !== null && CALLEE_NAME_PATTERN.test(callee) ? callee : null
}

const readCallStatement: ReadSeeds = (statement, context, reader) => {
  const written = statement.firstNamedChild
  const called = written === null ? null : unawaited(written)
  if (isAtRoot(context) || called?.type !== CALL_TYPE) return []
  return typeOfExpression(called, context, reader) === null ? [seedAt(statement, "call", nameOfCallee(called))] : []
}

const readElement: ReadSeeds = (element, _context, reader) => [
  { ...seedAt(element, "render", elementNameOf(element)), ...catalogued(reader.naming.blockAt(element)?.catalogue) },
]

const fixed = (type: CodeBlockType): ReadSeeds => (node) => [seedAt(node, type)]

const READERS: ReadonlyMap<string, ReadSeeds> = new Map<string, ReadSeeds>([
  ["import_statement", fixed("import")],
  [EXPORT_TYPE, readExport],
  [DECLARATOR_TYPE, readDeclarator],
  ["function_declaration", readDeclaredCallable],
  ["generator_function_declaration", readDeclaredCallable],
  ["arrow_function", readInlineCallable],
  ["function_expression", readInlineCallable],
  ["generator_function", readInlineCallable],
  ["method_definition", readMethod],
  [FIELD_TYPE, readField],
  ["assignment_expression", readAssignedMember],
  ["augmented_assignment_expression", readWrittenParameterMember],
  ["update_expression", readWrittenParameterMember],
  [PAIR_TYPE, readOption],
  ["shorthand_property_identifier", readOption],
  ["class_declaration", readClass],
  ["abstract_class_declaration", readClass],
  ["class", readClass],
  ["interface_declaration", readTypeDeclaration],
  ["type_alias_declaration", readTypeDeclaration],
  ["ambient_declaration", fixed("type-declaration")],
  ["function_signature", readTypeDeclaration],
  ["enum_declaration", readEnumeration],
  ["if_statement", fixed("condition")],
  ["ternary_expression", (node) => [seedAt(node, isMarkupCondition(node) ? "render-condition" : "condition")]],
  ["binary_expression", (node) => (isMarkupCondition(node) ? [seedAt(node, "render-condition")] : [])],
  ["switch_statement", fixed("switch")],
  ["switch_case", fixed("switch-case")],
  ["switch_default", fixed("switch-case")],
  ["for_statement", fixed("loop")],
  ["for_in_statement", fixed("loop")],
  ["while_statement", fixed("loop")],
  ["do_statement", fixed("loop")],
  ["try_statement", fixed("try-catch")],
  ["throw_statement", fixed("throw")],
  ["return_statement", readReturn],
  ["jsx_element", readElement],
  ["jsx_self_closing_element", readElement],
  ["jsx_fragment", fixed("render")],
  ["jsx_attribute", readAttribute],
  [STATEMENT_TYPE, readCallStatement],
  [CALL_TYPE, readExpression],
  [MEMBER_TYPE, readExpression],
  [CONSTRUCTION_TYPE, readExpression],
])

const rootStatementTypeOf = (node: SyntaxNode): CodeBlockType => (isDirective(node) ? "directive" : "root-statement")

const readRootStatement: ReadSeeds = (node, context) => {
  const isLoose = isAtRoot(context) && node.parent?.type === PROGRAM_TYPE && !BLOCKLESS_ROOT_TYPES.has(node.type)
  return isLoose ? [seedAt(node, rootStatementTypeOf(node))] : []
}

const readPassedCallback: ReadSeeds = (node, _context, reader) => {
  const slot = node.parent?.type === ARGUMENTS_TYPE ? findCallbackSlot(node, reader) : null
  return slot === null ? [] : [slotSeed(node, slot, reader)]
}

const readReturnedMarkup: ReadSeeds = (node, context) => {
  const isReturned = isArrowBody(node) && !context.isRenderedInPlace && isMarkup(node)
  return isReturned || isHeldMarkup(node, context) ? [seedAt(node, "render-root")] : []
}

const readSeeds: ReadSeeds = (node, context, reader) => [
  ...readRootStatement(node, context, reader),
  ...readPassedCallback(node, context, reader),
  ...readReturnedMarkup(node, context, reader),
  ...(READERS.get(node.type)?.(node, context, reader) ?? []),
]

const blocksOf = (seeds: readonly Seed[], context: WalkContext, filePath: string): ReadBlock[] =>
  seeds.reduce<ReadBlock[]>((blocks, { type, name, range, declaredAt, isReturned, isPlain, holdsMarkup, catalogue }) => {
    const outer = blocks.length === 0 ? undefined : blocks[blocks.length - 1]
    const takenIds = [...context.takenIds, ...blocks.map((block) => block.id)]
    const block: ReadBlock = {
      id: blockIdOf(filePath, type, range, takenIds),
      ...named(name ?? null),
      type,
      ranges: [range],
      parentId: outer === undefined ? context.parentId : outer.id,
      declaredAt,
      ...(isReturned === true ? { isReturned } : {}),
      ...(isPlain === true ? { isPlain } : {}),
      ...(holdsMarkup === true ? { holdsMarkup } : {}),
      ...(catalogue === undefined ? {} : { catalogue }),
    }
    return [...blocks, block]
  }, [])

const nameOfCallable = (callable: SyntaxNode): string | null => {
  const ownName = callable.childForFieldName("name")
  if (ownName !== null) return ownName.text
  const owner = isOwnedValue(callable, [DECLARATOR_TYPE, PAIR_TYPE, FIELD_TYPE]) ? callable.parent : null
  return owner?.childForFieldName("name")?.text ?? owner?.childForFieldName("key")?.text ?? null
}

const kindOfCallable = (callable: SyntaxNode, context: WalkContext): CallableKind => {
  if (callableTypeOf(nameOfCallable(callable)) === "hook") return "hook"
  return returnsMarkup(callable) && !context.isRenderedInPlace ? "component" : "plain"
}

const ownNameOfClass = (declared: SyntaxNode): string | null =>
  declared.childForFieldName("name")?.text ?? (isOwnedValue(declared, [DECLARATOR_TYPE, FIELD_TYPE]) ? (declared.parent?.childForFieldName("name")?.text ?? null) : null)

const nameOfClass = (declared: SyntaxNode, { className }: WalkContext): string | null => {
  const ownName = ownNameOfClass(declared)
  return className === null || ownName === null ? ownName : [className, ownName].join(MEMBER_SEPARATOR)
}

const withBlocks = (context: WalkContext, blocks: readonly ReadBlock[]): WalkContext => {
  if (blocks.length === 0) return context
  const innermost = blocks[blocks.length - 1]
  return {
    ...context,
    parentId: innermost.id,
    takenIds: [...context.takenIds, ...blocks.map((block) => block.id)],
    isInRootClass: innermost.type === "class" && isAtRoot(context),
    isRenderedInPlace: context.isRenderedInPlace || innermost.type === "render-loop",
    isInEvent: context.isInEvent || innermost.type === "render-event",
  }
}

const withNode = (context: WalkContext, node: SyntaxNode): WalkContext => {
  if (FUNCTION_TYPES.has(node.type)) return { ...context, callableKind: kindOfCallable(node, context) }
  if (CLASS_TYPES.has(node.type)) return { ...context, className: nameOfClass(node, context) }
  return node.type === EXPRESSION_HOLDER_TYPE ? { ...context, isRenderedInPlace: true } : context
}

const callableOf = (node: SyntaxNode): SyntaxNode | null => {
  if (FUNCTION_TYPES.has(node.type)) return node
  const value = node.childForFieldName("value")
  return value !== null && isFunctionValue(value) ? value : null
}

const isRootCallable = (blocks: readonly ReadBlock[], context: WalkContext): boolean =>
  blocks.length === 1 && CALLABLE_BLOCK_TYPES.has(blocks[0].type) && (isAtRoot(context) || context.isInRootClass)

const readRootArguments = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext, reader: BlockReader): ReadBlock[] => {
  const callable = callableOf(node)
  if (callable === null || !isRootCallable(blocks, context)) return []
  return readArgumentBlocks(callable, { filePath: reader.filePath, outline: reader.outline, ownerId: blocks[0].id })
}

const readBound = (written: SyntaxNode, pattern: SyntaxNode | null, ownerId: string | null, filePath: string): ReadBlock[] => {
  const bindings = pattern === null || pattern.type === RECEIVER_TYPE ? [] : bindingNamesIn(pattern)
  if (bindings.length === 0) return []
  const range = rangeOfNode(written)
  return [{ id: blockIdOf(filePath, "variable", range, []), name: bindings[0].text, type: "variable", ranges: [range], parentId: ownerId, declaredAt: bindings.map(startOf), isParameter: true }]
}

const readInnerParameters = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext, reader: BlockReader): ReadBlock[] => {
  const callable = callableOf(node)
  const owner = [...blocks].reverse().find((block) => CALLABLE_BLOCK_TYPES.has(block.type))
  if (callable === null || owner === undefined || isRootCallable(blocks, context)) return []
  return listParameters(callable).flatMap((parameter) => readBound(parameter, patternOf(parameter), owner.id, reader.filePath))
}

const readIterated = (node: SyntaxNode, blocks: readonly ReadBlock[], reader: BlockReader): ReadBlock[] => {
  const pattern = node.type === ITERATION_TYPE && node.childForFieldName("kind") !== null ? node.childForFieldName("left") : null
  return pattern === null || blocks.length === 0 ? [] : readBound(pattern, pattern, blocks[blocks.length - 1].id, reader.filePath)
}

const readCaught = (node: SyntaxNode, context: WalkContext, reader: BlockReader): ReadBlock[] => {
  const pattern = node.type === CATCH_TYPE ? node.childForFieldName("parameter") : null
  return pattern === null ? [] : readBound(pattern, pattern, context.parentId, reader.filePath)
}

interface ContextStack {
  readonly context: WalkContext
  readonly below: ContextStack | null
}

const withMemberPath = (block: ReadBlock, memberPath: readonly string[]): ReadBlock =>
  memberPath.length > 0 && MEMBER_BLOCK_TYPES.has(block.type) ? { ...block, memberPath } : block

const isModuleWide = (node: SyntaxNode): boolean => MODULE_WIDE_TYPES.has(node.type) && exportingStatementOf(node).parent?.type === PROGRAM_TYPE

const contextAt = (node: SyntaxNode, context: WalkContext): WalkContext => (isModuleWide(node) ? { ...context, parentId: null } : context)

const readBlocksAt = (node: SyntaxNode, walked: WalkContext, reader: BlockReader): ReadBlock[] => {
  const context = contextAt(node, walked)
  const memberPath = memberPathOf(node)
  const blocks = blocksOf(readSeeds(node, context, reader), context, reader.filePath).map((block) => withMemberPath(block, memberPath))
  return [
    ...blocks,
    ...readRootArguments(node, blocks, context, reader),
    ...readInnerParameters(node, blocks, context, reader),
    ...readIterated(node, blocks, reader),
    ...readCaught(node, context, reader),
  ]
}

const contextWithin = (node: SyntaxNode, blocks: readonly ReadBlock[], context: WalkContext): WalkContext =>
  withNode(withBlocks(context, blocks.filter((block) => block.argument === undefined && block.isParameter !== true)), node)

function* walkBlocks(cursor: SyntaxCursor, reader: BlockReader, start: WalkContext): Generator<ReadBlock> {
  for (let contexts: ContextStack = { context: start, below: null }, isArriving = true; ;) {
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

const COMPONENT_BODY: CallableKind = "component"

const startWithin = (componentId: string | null): WalkContext =>
  componentId === null ? START : { ...START, parentId: componentId, takenIds: [componentId], callableKind: COMPONENT_BODY }

export const readBlocks = (reader: BlockReader, componentId: string | null = null): ReadBlock[] =>
  withDecoratorsInside([...walkBlocks(reader.outline.tree.rootNode.walk(), reader, startWithin(componentId))])
