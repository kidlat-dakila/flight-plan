import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import { readBindings as readScopedBindings } from "@/ast-graph/languages/python/bindings"
import { parseWithGrammar, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { chainFrom, selfAndAncestorsOf } from "@/ast-graph/walk-tree"
import { annotatedTypeFilling, annotatedTypeOf } from "@/code-blocks/languages/python/annotated"
import { NO_EXPRESSION, type Binding, type DeclaredMember, type Expression, type ParameterBinding, type PassedValue, type Site, type SyntaxReader } from "./syntax-reader"

const GRAMMAR: GrammarId = "python"
const NAME_TYPE = "identifier"
const MEMBER_TYPE = "attribute"
const CALL_TYPE = "call"
const DECORATOR_TYPE = "decorator"
const CLASS_TYPE = "class_definition"
const FUNCTION_TYPE = "function_definition"
const IMPORT_TYPE = "import_statement"
const IMPORT_FROM_TYPE = "import_from_statement"
const ALIASED_TYPE = "aliased_import"
const MODULE_PATH_TYPE = "dotted_name"
const ASSIGNMENT_TYPE = "assignment"
const RENAMED_TYPE = "as_pattern"
const RENAMED_TARGET_TYPE = "as_pattern_target"
const NAMED_ARGUMENT_TYPE = "keyword_argument"
const COMMENT_TYPE = "comment"
const UNPACKED_TYPES: ReadonlySet<string> = new Set(["dictionary_splat", "list_splat"])
const ARGUMENTS_TYPE = "argument_list"
const OPTIONS_TYPE = "dictionary"
const PAIR_TYPE = "pair"
const LIST_TYPES: ReadonlySet<string> = new Set(["list", "tuple"])
const TEXT_TYPE = "string"
const TEXT_CONTENT_TYPE = "string_content"
const INTERPOLATION_TYPE = "interpolation"
const FIRST_POSITION = 0
const WRAPPING_TYPES: ReadonlySet<string> = new Set(["await", "parenthesized_expression"])
const SUBSCRIPT_TYPE = "subscript"
const FUNCTION_VALUE_TYPE = "lambda"
const BUILTINS_MODULE = "builtins"
const BINDING_PATTERN = patternOfTypes([IMPORT_TYPE, IMPORT_FROM_TYPE, ASSIGNMENT_TYPE, RENAMED_TYPE, CLASS_TYPE, FUNCTION_TYPE])
const SITE_PATTERN = patternOfTypes([CALL_TYPE, DECORATOR_TYPE, CLASS_TYPE, ASSIGNMENT_TYPE])

interface NamedBinding {
  readonly name: string
  readonly startIndex: number
  readonly binding: Binding | null
}

const expressionOf = (node: SyntaxNode): Expression => {
  if (node.type === NAME_TYPE) return { kind: "name", name: node }
  const object = node.childForFieldName("object")
  const property = node.childForFieldName("attribute")
  if (node.type === MEMBER_TYPE && object !== null && property !== null) return { kind: "member", object, property: property.text }
  const callee = node.type === CALL_TYPE ? node.childForFieldName("function") : null
  if (callee !== null) return { kind: "call", callee }
  const wrapped = WRAPPING_TYPES.has(node.type) ? node.firstNamedChild : null
  const inner = annotatedTypeOf(node) ?? (node.type === SUBSCRIPT_TYPE ? node.childForFieldName("value") : wrapped)
  return inner === null ? NO_EXPRESSION : { kind: "wrapped", inner }
}

const named = (name: SyntaxNode, binding: Binding | null): NamedBinding => ({ name: name.text, startIndex: name.startIndex, binding })

const importedModuleOf = (imported: SyntaxNode): NamedBinding[] => {
  const module = imported.type === ALIASED_TYPE ? imported.childForFieldName("name") : imported
  const alias = imported.type === ALIASED_TYPE ? imported.childForFieldName("alias") : null
  if (module?.type !== MODULE_PATH_TYPE) return []
  const [topModule] = module.namedChildren
  if (alias !== null) return [named(alias, { kind: "import", specifier: module.text, importedName: NAMESPACE_IMPORT })]
  return [named(topModule, { kind: "import", specifier: topModule.text, importedName: NAMESPACE_IMPORT })]
}

const importedNameOf = (imported: SyntaxNode, specifier: string): NamedBinding[] => {
  const name = imported.type === ALIASED_TYPE ? imported.childForFieldName("name") : imported
  const local = imported.type === ALIASED_TYPE ? imported.childForFieldName("alias") : imported
  if (name === null || local === null) return []
  return [{ name: local.text, startIndex: local.startIndex, binding: { kind: "import", specifier, importedName: name.text } }]
}

const bindingsOfImportFrom = (statement: SyntaxNode): NamedBinding[] => {
  const module = statement.childForFieldName("module_name")
  if (module === null) return []
  return statement.childrenForFieldName("name").flatMap((imported) => importedNameOf(imported, module.text))
}

const bindingsOfAssignment = (assignment: SyntaxNode): NamedBinding[] => {
  const target = assignment.childForFieldName("left")
  const value = assignment.childForFieldName("right")
  if (target === null || value === null) return []
  if (target.type === NAME_TYPE) return [named(target, { kind: "value", value, memberPath: [] })]
  return target.namedChildren.filter((child) => child.type === NAME_TYPE).map((name) => named(name, null))
}

const bindingsOfRenamed = (renamed: SyntaxNode): NamedBinding[] => {
  const value = renamed.firstNamedChild
  const target = renamed.namedChildren.find((child) => child.type === RENAMED_TARGET_TYPE)?.firstNamedChild ?? null
  return value === null || target?.type !== NAME_TYPE ? [] : [named(target, { kind: "value", value, memberPath: [] })]
}

const bindingsOfDefinition = (definition: SyntaxNode): NamedBinding[] => {
  const name = definition.childForFieldName("name")
  if (name === null) return []
  return [named(name, definition.type === CLASS_TYPE ? { kind: "class", declaration: definition } : null)]
}

const bindingsAt = (node: SyntaxNode): NamedBinding[] => {
  if (node.type === IMPORT_TYPE) return node.namedChildren.flatMap(importedModuleOf)
  if (node.type === IMPORT_FROM_TYPE) return bindingsOfImportFrom(node)
  if (node.type === ASSIGNMENT_TYPE) return bindingsOfAssignment(node)
  return node.type === RENAMED_TYPE ? bindingsOfRenamed(node) : bindingsOfDefinition(node)
}

const isDeclaringName = (name: SyntaxNode, { startIndex, binding }: NamedBinding): boolean =>
  startIndex === name.startIndex || (binding?.kind === "value" && binding.value.startIndex <= name.startIndex && name.endIndex <= binding.value.endIndex)

const bindingAmong = (bindings: readonly NamedBinding[], name: SyntaxNode): Binding | null => {
  const sameName = bindings.filter((declared) => declared.name === name.text && !isDeclaringName(name, declared))
  const earlier = sameName.filter((declared) => declared.startIndex < name.startIndex)
  const nearest = [...earlier.slice(-1), ...sameName.slice(0, 1)]
  return nearest.length === 0 ? null : nearest[0].binding
}

const basesOf = (declaration: SyntaxNode): SyntaxNode[] =>
  (declaration.childForFieldName("superclasses")?.namedChildren ?? []).filter((base) => base.type !== NAMED_ARGUMENT_TYPE && base.type !== COMMENT_TYPE)

const assignedSiteOf = (node: SyntaxNode): Site[] => {
  const left = node.childForFieldName("left")
  return left?.type === MEMBER_TYPE && node.childForFieldName("right") !== null ? [{ kind: "assignment", node, callee: left }] : []
}

const siteOf = (node: SyntaxNode): Site[] => {
  if (node.type === CLASS_TYPE) return [{ kind: "class", node, bases: basesOf(node) }]
  if (node.type === ASSIGNMENT_TYPE) return assignedSiteOf(node)
  const written = node.type === DECORATOR_TYPE ? node.firstNamedChild : node
  const callee = written?.type === CALL_TYPE ? written.childForFieldName("function") : written
  if (callee === null) return []
  return [{ kind: node.type === DECORATOR_TYPE ? "decorator" : "call", node, callee }]
}

const ASSIGNED_POSITION = 0

const passedTo = (site: SyntaxNode): PassedValue[] => {
  const assigned = site.type === ASSIGNMENT_TYPE ? site.childForFieldName("right") : null
  if (assigned !== null) return [{ position: ASSIGNED_POSITION, name: null, node: assigned }]
  const call = site.type === DECORATOR_TYPE ? site.firstNamedChild : site
  const given = call?.type === CALL_TYPE ? call.childForFieldName("arguments") : null
  if (given?.type !== ARGUMENTS_TYPE) return []
  const written = given.namedChildren.filter((argument) => argument.type !== COMMENT_TYPE && !UNPACKED_TYPES.has(argument.type))
  const positional = written.filter((argument) => argument.type !== NAMED_ARGUMENT_TYPE)
  const filling = call === null ? null : annotatedTypeFilling(call)
  const filled: PassedValue[] = filling === null ? [] : [{ position: FIRST_POSITION, name: null, node: filling }]
  return [...filled, ...written.flatMap((argument): PassedValue[] => {
    if (argument.type !== NAMED_ARGUMENT_TYPE) return [{ position: positional.indexOf(argument), name: null, node: argument }]
    const name = argument.childForFieldName("name")
    const value = argument.childForFieldName("value")
    return name === null || value === null ? [] : [{ position: null, name: name.text, node: value }]
  })]
}

const textOf = (value: SyntaxNode): string | null => {
  if (value.type !== TEXT_TYPE || value.namedChildren.some((part) => part.type === INTERPOLATION_TYPE)) return null
  return value.namedChildren
    .filter((part) => part.type === TEXT_CONTENT_TYPE)
    .map((part) => part.text)
    .join("")
}

const propertyOf = (pair: SyntaxNode): PassedValue[] => {
  const key = pair.childForFieldName("key")
  const value = pair.childForFieldName("value")
  const name = key === null ? null : textOf(key)
  return pair.type === PAIR_TYPE && name !== null && value !== null ? [{ position: null, name, node: value }] : []
}

const readBindings = (tree: SyntaxTree): NamedBinding[] =>
  [...nodesMatching(GRAMMAR, tree, BINDING_PATTERN).flatMap(bindingsAt)].sort((one, two) => one.startIndex - two.startIndex)

export type FindImportedBinding = (name: SyntaxNode) => Binding | null

const findNothingImported: FindImportedBinding = () => null

const followedImport = (binding: Binding | null, name: SyntaxNode, findImported: FindImportedBinding): Binding | null =>
  binding?.kind === "import" ? (findImported(name) ?? binding) : binding

const listBoundNames = (tree: SyntaxTree): ReadonlySet<string> => {
  const { variables, imports, classNames } = readScopedBindings(tree)
  return new Set([...variables.map(({ name }) => name), ...imports.map(({ name }) => name.text), ...classNames.map(({ text }) => text)])
}

const PARAMETERS_FIELD = "parameters"
const DECORATED_TYPE = "decorated_definition"
const BLOCK_TYPE = "block"
const STATIC_METHOD = "staticmethod"

const nameOfParameter = (parameter: SyntaxNode): string | null =>
  parameter.type === NAME_TYPE ? parameter.text : (parameter.namedChildren.find((child) => child.type === NAME_TYPE)?.text ?? null)

const parametersOf = (definition: SyntaxNode): SyntaxNode[] =>
  (definition.childForFieldName(PARAMETERS_FIELD)?.namedChildren ?? []).filter((parameter) => parameter.type !== COMMENT_TYPE)

const parameterNamesOf = (definition: SyntaxNode): (string | null)[] => parametersOf(definition).map(nameOfParameter)

const TYPE_NAME_TYPES: ReadonlySet<string> = new Set([NAME_TYPE, MEMBER_TYPE])

const ancestorsOf = (node: SyntaxNode): SyntaxNode[] => selfAndAncestorsOf(node).slice(1)

const isTypeName = (node: SyntaxNode): boolean => TYPE_NAME_TYPES.has(node.type)

const typeNameOf = (annotation: SyntaxNode | null): SyntaxNode | null => [...chainFrom(annotation, annotatedTypeOf)].find(isTypeName) ?? null

const parameterTypeOf = (parameter: SyntaxNode): SyntaxNode | null => typeNameOf(parameter.childForFieldName("type")?.firstNamedChild ?? null)

const isStaticMethod = (definition: SyntaxNode): boolean =>
  definition.parent?.type === DECORATED_TYPE && definition.parent.namedChildren.some((child) => child.type === DECORATOR_TYPE && child.text.endsWith(STATIC_METHOD))

const classOfMethod = (definition: SyntaxNode): SyntaxNode | null => {
  const written = definition.parent?.type === DECORATED_TYPE ? definition.parent : definition
  const block = written.parent
  return block?.type === BLOCK_TYPE && block.parent?.type === CLASS_TYPE && !isStaticMethod(definition) ? block.parent : null
}

const isDefiningFunction = (node: SyntaxNode, name: string): boolean => node.type === FUNCTION_TYPE && parameterNamesOf(node).includes(name)

const definingFunctionOf = (name: SyntaxNode): SyntaxNode | null => {
  const scope = ancestorsOf(name).find((ancestor) => ancestor.type === CLASS_TYPE || isDefiningFunction(ancestor, name.text))
  return scope?.type === FUNCTION_TYPE ? scope : null
}

const receiverBindingOf = (name: SyntaxNode): Binding | null => {
  const definition = definingFunctionOf(name)
  const declaration = definition === null || parameterNamesOf(definition)[0] !== name.text ? null : classOfMethod(definition)
  return declaration === null ? null : { kind: "class", declaration }
}

const parameterBindingOf = (name: SyntaxNode): ParameterBinding | null => {
  const definition = definingFunctionOf(name)
  const parameters = definition === null ? [] : parametersOf(definition)
  const position = parameters.findIndex((parameter) => nameOfParameter(parameter) === name.text)
  return definition === null || position < 0 ? null : { kind: "parameter", holder: definition, parameter: parameters[position], position }
}

const typeDeclared = (annotation: SyntaxNode | null): DeclaredMember[] => {
  const type = typeNameOf(annotation?.firstNamedChild ?? null)
  return type === null ? [] : [{ kind: "type", node: type }]
}

const valueDeclared = (value: SyntaxNode | null): DeclaredMember[] => (value === null ? [] : [{ kind: "value", node: value }])

const declaredBy = (assignment: SyntaxNode): DeclaredMember[] => [
  ...typeDeclared(assignment.childForFieldName("type")),
  ...valueDeclared(assignment.childForFieldName("right")),
]

const isNameAssigned = (assignment: SyntaxNode, name: string): boolean => {
  const target = assignment.childForFieldName("left")
  return target?.type === NAME_TYPE && target.text === name
}

const isOwnMemberAssigned = (assignment: SyntaxNode, declaration: SyntaxNode, name: string): boolean => {
  const target = assignment.childForFieldName("left")
  const receiver = target?.type === MEMBER_TYPE ? target.childForFieldName("object") : null
  const bound = receiver?.type === NAME_TYPE ? receiverBindingOf(receiver) : null
  return target?.childForFieldName("attribute")?.text === name && bound?.kind === "class" && bound.declaration.id === declaration.id
}

const listDeclaredMembers = (declaration: SyntaxNode, name: string): DeclaredMember[] => {
  const body = declaration.childForFieldName("body")
  if (body === null) return []
  const atClass = body.namedChildren.flatMap((statement) => statement.namedChildren).filter((assignment) => assignment.type === ASSIGNMENT_TYPE && isNameAssigned(assignment, name))
  const inMethods = body.descendantsOfType(ASSIGNMENT_TYPE).filter((assignment) => isOwnMemberAssigned(assignment, declaration, name))
  return [...atClass, ...inMethods].flatMap(declaredBy)
}

const builtinBindingOf = (name: SyntaxNode, boundNames: ReadonlySet<string>): Binding | null =>
  boundNames.has(name.text) ? null : { kind: "import", specifier: BUILTINS_MODULE, importedName: name.text }

export const pythonReaderOf = (tree: SyntaxTree, findImported: FindImportedBinding = findNothingImported): SyntaxReader => {
  const bindings = readBindings(tree)
  const boundNames = listBoundNames(tree)
  return {
    language: "python",
    tree,
    expressionOf,
    bindingOf: (name) =>
      receiverBindingOf(name) ?? followedImport(bindingAmong(bindings, name), name, findImported) ?? parameterBindingOf(name) ?? builtinBindingOf(name, boundNames),
    basesOf,
    handedAt: () => null,
    parameterTypeOf,
    listDeclaredMembers,
    functionTypeOf: () => null,
    requiredSpecifierOf: () => null,
    listSites: () => nodesMatching(GRAMMAR, tree, SITE_PATTERN).flatMap(siteOf),
    listDirectives: () => [],
    passedTo,
    propertiesOf: (value) => (value.type === OPTIONS_TYPE ? value.namedChildren.flatMap(propertyOf) : null),
    itemsOf: (value) => (LIST_TYPES.has(value.type) ? value.namedChildren.filter((item) => item.type !== COMMENT_TYPE) : null),
    textOf,
    isFunction: (value) => value.type === FUNCTION_VALUE_TYPE,
  }
}

export const readPython = (source: string): SyntaxReader => pythonReaderOf(parseWithGrammar(GRAMMAR, source))

const withReader = (binding: Binding | null, reader: SyntaxReader): Binding | null =>
  binding?.kind === "value" || binding?.kind === "class" ? { ...binding, reader } : binding

export const declaredBindingAt = (reader: SyntaxReader, declaredName: SyntaxNode): Binding | null => {
  const declared = readBindings(reader.tree).find(({ startIndex }) => startIndex === declaredName.startIndex)
  return withReader(declared?.binding ?? null, reader)
}
