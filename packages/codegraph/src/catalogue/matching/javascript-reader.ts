import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import { moduleExportsHolding } from "@/ast-graph/languages/typescript/exports"
import { readImportVariables, specifierRequiredBy } from "@/ast-graph/languages/typescript/imports"
import { isDirective, isFieldOf, isQuoted, textOfName, unquoted } from "@/ast-graph/languages/typescript/syntax"
import { parseWithGrammar, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { FileVariable } from "@/ast-graph/types"
import { classBodyBoundTo, isParameterProperty, memberAssignedIn } from "@/code-blocks/languages/typescript/class-members"
import { readOutline, resolutionOf, type FileOutline } from "@/code-blocks/languages/typescript/outline"
import { NO_EXPRESSION, type Binding, type DeclaredMember, type Directive, type Expression, type FindExportedBinding, type FindHandedAway, type HandedCallback, type ImportBinding, type ParameterBinding, type PassedValue, type Site, type SyntaxReader } from "./syntax-reader"

const FIRST_LINE = 1
const NAME_TYPES: ReadonlySet<string> = new Set(["identifier", "type_identifier", "property_identifier"])
const MEMBER_TYPES: ReadonlySet<string> = new Set(["member_expression", "nested_identifier"])
const CALL_TYPE = "call_expression"
const CONSTRUCTION_TYPE = "new_expression"
const DECORATOR_TYPE = "decorator"
const ELEMENT_TYPE = "jsx_element"
const OPENING_TYPE = "jsx_opening_element"
const LONE_ELEMENT_TYPE = "jsx_self_closing_element"
const ATTRIBUTE_TYPE = "jsx_attribute"
const EMBEDDED_TYPE = "jsx_expression"
const MARKUP_TEXT_TYPE = "jsx_text"
const CLOSING_TYPE = "jsx_closing_element"
const CHILDREN = "children"
const CLASS_TYPES: ReadonlySet<string> = new Set(["class_declaration", "abstract_class_declaration", "class"])
const HERITAGE_TYPE = "class_heritage"
const EXTENDING_TYPE = "extends_clause"
const WRAPPING_TYPES: ReadonlySet<string> = new Set([
  "await_expression",
  "parenthesized_expression",
  "as_expression",
  "satisfies_expression",
  "non_null_expression",
])
const DECLARATOR_TYPE = "variable_declarator"
const FUNCTION_TYPES: ReadonlySet<string> = new Set(["arrow_function", "function_expression", "generator_function", "method_definition"])
const SUBSCRIPT_TYPE = "subscript_expression"
const PARAMETERS_TYPE = "formal_parameters"
const PARAMETER_TYPES: ReadonlySet<string> = new Set(["required_parameter", "optional_parameter"])
const ARGUMENTS_TYPE = "arguments"
const SHORTHAND_PATTERN_TYPE = "shorthand_property_identifier_pattern"
const RENAMING_TYPE = "pair_pattern"
const TAKING_APART_TYPES: ReadonlySet<string> = new Set(["object_pattern", "object_assignment_pattern", RENAMING_TYPE])
const OPTIONS_TYPE = "object"
const PAIR_TYPE = "pair"
const METHOD_TYPE = "method_definition"
const SHORTHAND_TYPE = "shorthand_property_identifier"
const LIST_TYPE = "array"
const COMMENT_TYPE = "comment"
const TEMPLATE_TYPE = "template_string"
const STATEMENT_TYPE = "expression_statement"
const CALL_PATTERN = patternOfTypes([CALL_TYPE])
const GENERIC_TYPE = "generic_type"
const ASSIGNMENT_TYPE = "assignment_expression"
const CODE_SITE_TYPES: readonly string[] = [CALL_TYPE, CONSTRUCTION_TYPE, DECORATOR_TYPE, ASSIGNMENT_TYPE, ...CLASS_TYPES]
const MARKUP_GRAMMAR: GrammarId = "tsx"
const SITE_PATTERNS: Readonly<Record<string, string>> = {
  typescript: patternOfTypes(CODE_SITE_TYPES),
  tsx: patternOfTypes([...CODE_SITE_TYPES, OPENING_TYPE, LONE_ELEMENT_TYPE]),
}
const STATEMENT_PATTERN = patternOfTypes([STATEMENT_TYPE])

interface Declared {
  readonly declarator: SyntaxNode
  readonly memberPath: readonly string[]
}

const expressionOf = (node: SyntaxNode): Expression => {
  if (NAME_TYPES.has(node.type) || node.type === RECEIVER_TYPE) return { kind: "name", name: node }
  const object = node.childForFieldName("object")
  const property = node.childForFieldName("property")
  if (MEMBER_TYPES.has(node.type) && object !== null && property !== null) return { kind: "member", object, property: property.text }
  const callee = node.childForFieldName(node.type === CONSTRUCTION_TYPE ? "constructor" : "function")
  if ((node.type === CALL_TYPE || node.type === CONSTRUCTION_TYPE) && callee !== null) return { kind: "call", callee }
  const inner = WRAPPING_TYPES.has(node.type) ? node.firstNamedChild : null
  const held = node.type === SUBSCRIPT_TYPE ? object : inner
  return held === null ? NO_EXPRESSION : { kind: "wrapped", inner: held }
}

const takenApartKeyOf = (node: SyntaxNode, holder: SyntaxNode): string[] => {
  if (node.type === SHORTHAND_PATTERN_TYPE) return [node.text]
  const key = holder.type === RENAMING_TYPE && isFieldOf(node, "value") ? holder.childForFieldName("key") : null
  return key === null ? [] : [textOfName(key)]
}

const declaredFrom = (node: SyntaxNode, memberPath: readonly string[]): Declared | null => {
  const holder = node.parent
  if (holder === null) return null
  if (holder.type === DECLARATOR_TYPE) return isFieldOf(node, "name") ? { declarator: holder, memberPath } : null
  return TAKING_APART_TYPES.has(holder.type) ? declaredFrom(holder, [...takenApartKeyOf(node, holder), ...memberPath]) : null
}

const nameNodeOf = (tree: SyntaxTree, { range }: { readonly range: FileVariable["range"] }): SyntaxNode =>
  tree.rootNode.namedDescendantForPosition(
    { row: range.start.line - FIRST_LINE, column: range.start.column },
    { row: range.end.line - FIRST_LINE, column: range.end.column },
  )

const ONLY_PARAMETER = 0

const parameterBindingOf = (name: SyntaxNode): ParameterBinding | null => {
  const holder = name.parent
  if (holder === null) return null
  if (isFieldOf(name, "parameter")) return { kind: "parameter", holder, parameter: name, position: ONLY_PARAMETER }
  const parameters = PARAMETER_TYPES.has(holder.type) && isFieldOf(name, "pattern") ? holder.parent : null
  const declaring = parameters?.type === PARAMETERS_TYPE ? parameters.parent : null
  if (parameters === null || declaring === null) return null
  return { kind: "parameter", holder: declaring, parameter: holder, position: parameters.namedChildren.findIndex((parameter) => parameter.id === holder.id) }
}

const callOfPassed = (passed: SyntaxNode): SyntaxNode | null => {
  const option = passed.parent?.type === PAIR_TYPE ? passed.parent.parent : null
  const argument = option?.type === OPTIONS_TYPE ? option : passed
  return argument.parent?.type === ARGUMENTS_TYPE ? argument.parent.parent : null
}

const handedOf = (passed: SyntaxNode): HandedCallback | null => {
  const call = callOfPassed(passed)
  return call === null ? null : { call, passed }
}

const nameOfFunction = (callback: SyntaxNode): SyntaxNode | null => {
  const own = callback.childForFieldName("name")
  if (own !== null) return own
  const declarator = callback.parent?.type === DECLARATOR_TYPE && isFieldOf(callback, "value") ? callback.parent : null
  return declarator?.childForFieldName("name") ?? null
}

const namesOfFunction = (outline: FileOutline, callback: SyntaxNode): SyntaxNode[] => {
  const name = nameOfFunction(callback)
  if (name === null) return []
  const declared = rangeOf(name)
  return outline.resolved
    .filter(({ resolution }) => resolution.kind === "local" && isSameRange(resolution.declaration.range, declared))
    .map(({ reference }) => nameNodeOf(outline.tree, reference))
}

const exportedNamesOf = (outline: FileOutline, callback: SyntaxNode): string[] => {
  const name = nameOfFunction(callback)
  const declared = [rangeOf(callback), ...(name === null ? [] : [rangeOf(name)])]
  return outline.localExports.filter(({ declaration }) => declared.some((range) => isSameRange(range, declaration.range))).map(({ exportedName }) => exportedName)
}

const moduleNamesOf = (outline: FileOutline, callback: SyntaxNode): string[] => {
  const isModule = [callback, ...namesOfFunction(outline, callback)].some((value) => moduleExportsHolding(value) !== null)
  return [...exportedNamesOf(outline, callback), ...(isModule ? [NAMESPACE_IMPORT] : [])]
}

const handedAt = (outline: FileOutline, callback: SyntaxNode, findHandedAway: FindHandedAway): HandedCallback | null => {
  const handedHere = handedOf(callback) ?? namesOfFunction(outline, callback).map(handedOf).find((handed) => handed !== null) ?? null
  if (handedHere !== null) return handedHere
  const moduleNames = moduleNamesOf(outline, callback)
  return moduleNames.length === 0 ? null : findHandedAway(moduleNames)
}

const nameOfType = (type: SyntaxNode | null): SyntaxNode | null =>
  type?.type === GENERIC_TYPE ? type.childForFieldName("name") : type

const parameterTypeOf = (parameter: SyntaxNode): SyntaxNode | null => {
  const annotation = PARAMETER_TYPES.has(parameter.type) ? parameter.childForFieldName("type") : null
  return nameOfType(annotation?.firstNamedChild ?? null)
}

const FIELD_TYPE = "public_field_definition"
const CONSTRUCTOR_NAME = "constructor"
const MEMBER_ASSIGNMENT_TYPE = "assignment_expression"

const declaredType = (annotation: SyntaxNode | null): DeclaredMember[] => {
  const type = nameOfType(annotation?.firstNamedChild ?? null)
  return type === null ? [] : [{ kind: "type", node: type }]
}

const declaredValue = (value: SyntaxNode | null): DeclaredMember[] => (value === null ? [] : [{ kind: "value", node: value }])

const listDeclaredFields = (body: SyntaxNode, name: string): DeclaredMember[] =>
  body.namedChildren
    .filter((member) => member.type === FIELD_TYPE && member.childForFieldName("name")?.text === name)
    .flatMap((field) => [...declaredType(field.childForFieldName("type")), ...declaredValue(field.childForFieldName("value"))])

const isConstructor = (member: SyntaxNode): boolean => member.type === METHOD_TYPE && member.childForFieldName("name")?.text === CONSTRUCTOR_NAME

const listDeclaredParameterProperties = (body: SyntaxNode, name: string): DeclaredMember[] =>
  (body.namedChildren.find(isConstructor)?.childForFieldName("parameters")?.namedChildren ?? [])
    .filter((parameter) => isParameterProperty(parameter) && parameter.childForFieldName("pattern")?.text === name)
    .flatMap((parameter) => declaredType(parameter.childForFieldName("type")))

const listAssignedValues = (body: SyntaxNode, name: string): DeclaredMember[] =>
  body
    .descendantsOfType(MEMBER_ASSIGNMENT_TYPE)
    .filter((assignment) => classBodyBoundTo(assignment)?.id === body.id && memberAssignedIn(assignment)?.text === name)
    .flatMap((assignment) => declaredValue(assignment.childForFieldName("right")))

const listDeclaredMembers = (declaration: SyntaxNode, name: string): DeclaredMember[] => {
  const body = declaration.childForFieldName("body")
  return body === null ? [] : [...listDeclaredFields(body, name), ...listDeclaredParameterProperties(body, name), ...listAssignedValues(body, name)]
}

const functionTypeOf = (holder: SyntaxNode): SyntaxNode | null => {
  const declarator = holder.parent?.type === DECLARATOR_TYPE && isFieldOf(holder, "value") ? holder.parent : null
  return nameOfType(declarator?.childForFieldName("type")?.firstNamedChild ?? null)
}

const requiredSpecifierOf = (outline: FileOutline, call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function")
  return callee === null || resolutionOf(outline, callee) !== null ? null : specifierRequiredBy(call)
}

const isRequiring = (call: SyntaxNode, filePath: string, importedFilePaths: ReadonlyMap<string, string>): boolean => {
  const specifier = specifierRequiredBy(call)
  return specifier !== null && importedFilePaths.get(specifier) === filePath
}

const importsOf = (outline: FileOutline, filePath: string, moduleNames: readonly string[]): SyntaxNode[] =>
  outline.resolved
    .filter(({ resolution }) => resolution.kind === "import" && resolution.variable.importedFilePath === filePath && moduleNames.includes(resolution.variable.importedName))
    .map(({ reference }) => nameNodeOf(outline.tree, reference))

const requiresOf = (grammar: GrammarId, outline: FileOutline, filePath: string, importedFilePaths: ReadonlyMap<string, string>): SyntaxNode[] =>
  nodesMatching(grammar, outline.tree, CALL_PATTERN).filter((call) => isRequiring(call, filePath, importedFilePaths))

export interface HandingSearch {
  readonly grammar: GrammarId
  readonly outline: FileOutline
  readonly importedFilePaths: ReadonlyMap<string, string>
  readonly reader: SyntaxReader
}

export const listHandedImports = ({ grammar, outline, importedFilePaths, reader }: HandingSearch, filePath: string, moduleNames: readonly string[]): HandedCallback[] => {
  const required = moduleNames.includes(NAMESPACE_IMPORT) ? requiresOf(grammar, outline, filePath, importedFilePaths) : []
  return [...importsOf(outline, filePath, moduleNames), ...required].flatMap((passed) => {
    const handed = handedOf(passed)
    return handed === null ? [] : [{ ...handed, reader }]
  })
}

const bindingOfDeclared = (name: SyntaxNode): Binding | null => {
  const holder = name.parent
  const parameter = parameterBindingOf(name)
  if (parameter !== null) return parameter
  if (holder !== null && CLASS_TYPES.has(holder.type) && isFieldOf(name, "name")) return { kind: "class", declaration: holder }
  const declared = declaredFrom(name, name.type === SHORTHAND_PATTERN_TYPE ? [name.text] : [])
  const value = declared?.declarator.childForFieldName("value") ?? null
  if (declared === null || value === null) return null
  return CLASS_TYPES.has(value.type) ? { kind: "class", declaration: value } : { kind: "value", value, memberPath: declared.memberPath }
}

const RECEIVER_TYPE = "this"
const OWN_RECEIVER_TYPES: ReadonlySet<string> = new Set(["function_declaration", "function_expression", "generator_function", "generator_function_declaration"])

const classOfReceiver = (node: SyntaxNode | null): SyntaxNode | null => {
  if (node === null || OWN_RECEIVER_TYPES.has(node.type)) return null
  if (node.type !== METHOD_TYPE) return classOfReceiver(node.parent)
  const body = node.parent
  return body?.parent !== null && body?.parent !== undefined && CLASS_TYPES.has(body.parent.type) ? body.parent : null
}

const receiverBindingOf = (name: SyntaxNode): Binding | null => {
  const declaration = name.type === RECEIVER_TYPE ? classOfReceiver(name.parent) : null
  return declaration === null ? null : { kind: "class", declaration }
}

const bindingIn = (outline: FileOutline, name: SyntaxNode, findExported: FindExportedBinding): Binding | null => {
  if (name.type === RECEIVER_TYPE) return receiverBindingOf(name)
  const resolution = resolutionOf(outline, name)
  if (resolution === null) return null
  if (resolution.kind === "local") return bindingOfDeclared(nameNodeOf(outline.tree, resolution.declaration))
  const { specifier, importedName, importedFilePath } = resolution.variable
  return importedFilePath === null ? { kind: "import", specifier, importedName } : findExported(importedFilePath, importedName)
}

const basesOf = (declaration: SyntaxNode): SyntaxNode[] =>
  declaration.namedChildren
    .filter((child) => child.type === HERITAGE_TYPE)
    .flatMap((heritage) => heritage.namedChildren.filter((clause) => clause.type === EXTENDING_TYPE))
    .flatMap((clause) => {
      const base = clause.childForFieldName("value")
      return base === null ? [] : [base]
    })

const calleeOfDecorator = (decorator: SyntaxNode): SyntaxNode | null => {
  const written = decorator.firstNamedChild
  return written?.type === CALL_TYPE ? written.childForFieldName("function") : written
}

const assignedSiteOf = (node: SyntaxNode): Site[] => {
  const left = node.childForFieldName("left")
  return left !== null && MEMBER_TYPES.has(left.type) ? [{ kind: "assignment", node, callee: left }] : []
}

const siteOf = (node: SyntaxNode): Site[] => {
  if (CLASS_TYPES.has(node.type)) return [{ kind: "class", node, bases: basesOf(node) }]
  if (node.type === ASSIGNMENT_TYPE) return assignedSiteOf(node)
  if (node.type === DECORATOR_TYPE) {
    const callee = calleeOfDecorator(node)
    return callee === null ? [] : [{ kind: "decorator", node, callee }]
  }
  if (node.type === OPENING_TYPE || node.type === LONE_ELEMENT_TYPE) {
    const callee = node.childForFieldName("name")
    const element = node.type === OPENING_TYPE ? (node.parent ?? node) : node
    return callee === null ? [] : [{ kind: "element", node: element, callee }]
  }
  const callee = node.childForFieldName(node.type === CONSTRUCTION_TYPE ? "constructor" : "function")
  return callee === null ? [] : [{ kind: "call", node, callee }]
}

const positional = (nodes: readonly SyntaxNode[]): PassedValue[] =>
  nodes.filter((node) => node.type !== COMMENT_TYPE).map((node, position) => ({ position, name: null, node }))

const valueOfAttribute = (attribute: SyntaxNode): SyntaxNode => {
  const [, value] = attribute.namedChildren
  return value.type === EMBEDDED_TYPE ? (value.firstNamedChild ?? value) : value
}

const attributesOf = (opening: SyntaxNode): PassedValue[] =>
  opening.namedChildren
    .filter((child) => child.type === ATTRIBUTE_TYPE && child.namedChildCount > 1)
    .map((attribute) => ({ position: null, name: attribute.namedChildren[0].text, node: valueOfAttribute(attribute) }))

const NOT_CHILDREN: ReadonlySet<string> = new Set([OPENING_TYPE, CLOSING_TYPE, MARKUP_TEXT_TYPE])

const childrenOf = (element: SyntaxNode): PassedValue[] =>
  element.namedChildren
    .filter((child) => !NOT_CHILDREN.has(child.type))
    .map((child) => ({ position: null, name: CHILDREN, node: child.type === EMBEDDED_TYPE ? (child.firstNamedChild ?? child) : child }))

const ASSIGNED_POSITION = 0

const passedTo = (site: SyntaxNode): PassedValue[] => {
  if (site.type === ASSIGNMENT_TYPE) {
    const right = site.childForFieldName("right")
    return right === null ? [] : [{ position: ASSIGNED_POSITION, name: null, node: right }]
  }
  if (site.type === ELEMENT_TYPE) {
    const opening = site.childForFieldName("open_tag")
    return [...(opening === null ? [] : attributesOf(opening)), ...childrenOf(site)]
  }
  if (site.type === LONE_ELEMENT_TYPE) return attributesOf(site)
  const call = site.type === DECORATOR_TYPE ? site.firstNamedChild : site
  const given = call?.childForFieldName("arguments") ?? null
  return given === null || given.type === TEMPLATE_TYPE ? [] : positional(given.namedChildren)
}

const propertyOf = (member: SyntaxNode): PassedValue[] => {
  if (member.type === SHORTHAND_TYPE) return [{ position: null, name: member.text, node: member }]
  const key = member.childForFieldName(member.type === METHOD_TYPE ? "name" : "key")
  const value = member.type === METHOD_TYPE ? member : member.childForFieldName("value")
  const isProperty = member.type === PAIR_TYPE || member.type === METHOD_TYPE
  return isProperty && key !== null && value !== null ? [{ position: null, name: textOfName(key), node: value }] : []
}

const listDirectives = (grammar: GrammarId, tree: SyntaxTree): Directive[] =>
  nodesMatching(grammar, tree, STATEMENT_PATTERN)
    .filter(isDirective)
    .map((statement) => ({ text: unquoted(statement.firstNamedChild?.text ?? ""), node: statement }))

export interface JavascriptSyntax {
  readonly reader: SyntaxReader
  readonly importNamed: (name: string) => ImportBinding | null
}

const withReader = (binding: Binding | null, reader: SyntaxReader): Binding | null =>
  binding?.kind === "value" || binding?.kind === "class" ? { ...binding, reader } : binding

const findNothingHandedAway: FindHandedAway = () => null

export const javascriptReaderOf = (grammar: GrammarId, outline: FileOutline, findExported: FindExportedBinding, findHandedAway: FindHandedAway = findNothingHandedAway): SyntaxReader => ({
  language: "javascript",
  tree: outline.tree,
  expressionOf,
  bindingOf: (name) => bindingIn(outline, name, findExported),
  basesOf,
  handedAt: (callback) => handedAt(outline, callback, findHandedAway),
  parameterTypeOf,
  functionTypeOf,
  listDeclaredMembers,
  requiredSpecifierOf: (call) => requiredSpecifierOf(outline, call),
  listSites: () => nodesMatching(grammar, outline.tree, SITE_PATTERNS[grammar] ?? SITE_PATTERNS.typescript).flatMap(siteOf),
  listDirectives: () => listDirectives(grammar, outline.tree),
  passedTo,
  propertiesOf: (value) => (value.type === OPTIONS_TYPE ? value.namedChildren.flatMap(propertyOf) : null),
  itemsOf: (value) => (value.type === LIST_TYPE ? value.namedChildren.filter((item) => item.type !== COMMENT_TYPE) : null),
  textOf: (value) => (isQuoted(value) ? unquoted(value.text) : null),
  isFunction: (value) => FUNCTION_TYPES.has(value.type),
})

export const exportedBindingAt = (reader: SyntaxReader, declaredName: SyntaxNode): Binding | null => withReader(bindingOfDeclared(declaredName), reader)

const findNothingExported: FindExportedBinding = () => null

export const readJavascriptSyntax = (source: string): JavascriptSyntax => {
  const tree = parseWithGrammar(MARKUP_GRAMMAR, source)
  const imports = readImportVariables(MARKUP_GRAMMAR, tree, new Map())
  return {
    importNamed: (name) => {
      const imported = imports.find((variable) => variable.name === name)
      return imported === undefined ? null : { kind: "import", specifier: imported.specifier, importedName: imported.importedName }
    },
    reader: javascriptReaderOf(MARKUP_GRAMMAR, readOutline(MARKUP_GRAMMAR, tree, new Map()), findNothingExported),
  }
}

export const readJavascript = (source: string): SyntaxReader => readJavascriptSyntax(source).reader
