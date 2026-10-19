import * as path from "node:path"
import type { SyntaxNode } from "@/ast-graph/parser"

export interface PathModule {
  readonly namespaces: ReadonlySet<string>
  readonly functions: ReadonlyMap<string, string>
  readonly urlReaders: ReadonlySet<string>
}

const PATH_SPECIFIERS: ReadonlySet<string> = new Set(["path", "node:path", "path/posix", "node:path/posix"])
const URL_SPECIFIERS: ReadonlySet<string> = new Set(["url", "node:url"])
const JOINING_FUNCTIONS: ReadonlySet<string> = new Set(["resolve", "join"])
const URL_READER = "fileURLToPath"
const URL_CONSTRUCTOR = "URL"
const URL_PATH_MEMBER = "pathname"
const MODULE_FOLDER = "__dirname"
const MODULE_URL = "import.meta.url"
const REQUIRE = "require"
const ROOT_SEPARATOR = "/"
const SAME_FOLDER = "."
const NO_PATH_MODULE: PathModule = { namespaces: new Set(), functions: new Map(), urlReaders: new Set() }

const textOfString = (node: SyntaxNode | null): string | null =>
  node?.type === "string" ? node.namedChildren.map((part) => part.text).join("") : null

const sourceOfImport = (statement: SyntaxNode): string | null => textOfString(statement.childForFieldName("source"))

const requiredSourceOf = (value: SyntaxNode | null): string | null => {
  const callee = value?.type === "call_expression" ? value.childForFieldName("function") : null
  return callee?.text === REQUIRE ? textOfString(value?.childForFieldName("arguments")?.firstNamedChild ?? null) : null
}

const importedNamesOf = (statement: SyntaxNode): { readonly whole: string[], readonly named: (readonly [string, string])[] } => {
  const clause = statement.namedChildren.find((child) => child.type === "import_clause")
  const parts = clause?.namedChildren ?? []
  const whole = parts.flatMap((part) => {
    if (part.type === "identifier") return [part.text]
    return part.type === "namespace_import" ? part.namedChildren.filter((child) => child.type === "identifier").map((child) => child.text) : []
  })
  const named = parts
    .filter((part) => part.type === "named_imports")
    .flatMap((imports) => imports.namedChildren.filter((child) => child.type === "import_specifier"))
    .flatMap((specifier): (readonly [string, string])[] => {
      const name = specifier.childForFieldName("name")?.text
      const alias = specifier.childForFieldName("alias")?.text
      return name === undefined ? [] : [[alias ?? name, name] as const]
    })
  return { whole, named }
}

const requiredNamesOf = (declarator: SyntaxNode): { readonly whole: string[], readonly named: (readonly [string, string])[] } => {
  const name = declarator.childForFieldName("name")
  if (name?.type === "identifier") return { whole: [name.text], named: [] }
  const named = (name?.namedChildren ?? []).flatMap((property): (readonly [string, string])[] => {
    if (property.type === "shorthand_property_identifier_pattern") return [[property.text, property.text] as const]
    const key = property.childForFieldName("key")?.text
    const value = property.childForFieldName("value")?.text
    return property.type === "pair_pattern" && key !== undefined && value !== undefined ? [[value, key] as const] : []
  })
  return { whole: [], named }
}

const listDescendants = (node: SyntaxNode): SyntaxNode[] => [node, ...node.namedChildren.flatMap(listDescendants)]

export const readPathModule = (root: SyntaxNode): PathModule => {
  const imported = root.namedChildren
    .filter((statement) => statement.type === "import_statement")
    .map((statement) => ({ source: sourceOfImport(statement), ...importedNamesOf(statement) }))
  const required = listDescendants(root)
    .filter((node) => node.type === "variable_declarator")
    .map((declarator) => ({ source: requiredSourceOf(declarator.childForFieldName("value")), ...requiredNamesOf(declarator) }))
  const bound = [...imported, ...required]
  if (bound.length === 0) return NO_PATH_MODULE
  const ofPath = bound.filter(({ source }) => source !== null && PATH_SPECIFIERS.has(source))
  const ofUrl = bound.filter(({ source }) => source !== null && URL_SPECIFIERS.has(source))
  return {
    namespaces: new Set(ofPath.flatMap(({ whole }) => whole)),
    functions: new Map(ofPath.flatMap(({ named }) => named.filter(([, original]) => JOINING_FUNCTIONS.has(original)))),
    urlReaders: new Set(ofUrl.flatMap(({ named }) => named.filter(([, original]) => original === URL_READER).map(([local]) => local))),
  }
}

const isJoiningCallee = (callee: SyntaxNode, module: PathModule): boolean => {
  if (callee.type === "identifier") return module.functions.has(callee.text)
  const object = callee.childForFieldName("object")
  const property = callee.childForFieldName("property")?.text ?? ""
  return callee.type === "member_expression" && object?.type === "identifier" && module.namespaces.has(object.text) && JOINING_FUNCTIONS.has(property)
}

const argumentsOf = (call: SyntaxNode): SyntaxNode[] => (call.childForFieldName("arguments")?.namedChildren ?? []).filter((argument) => argument.type !== "comment")

const partOf = (argument: SyntaxNode): string | null => {
  if (argument.type === "identifier" && argument.text === MODULE_FOLDER) return SAME_FOLDER
  return textOfString(argument)
}

const joined = (parts: readonly string[]): string => {
  const fromLastRoot = parts.slice(Math.max(0, parts.map((part) => part.startsWith(ROOT_SEPARATOR)).lastIndexOf(true)))
  return path.posix.join(...fromLastRoot)
}

const joinedArguments = (call: SyntaxNode): string | null => {
  const parts = argumentsOf(call).map(partOf)
  return parts.length === 0 || parts.some((part) => part === null) ? null : joined(parts.filter((part): part is string => part !== null))
}

const urlPathOf = (construction: SyntaxNode | null): string | null => {
  if (construction?.type !== "new_expression" || construction.childForFieldName("constructor")?.text !== URL_CONSTRUCTOR) return null
  const passed = argumentsOf(construction)
  return passed.length > 1 && passed[1].text === MODULE_URL ? textOfString(passed[0]) : null
}

export const evaluatePath = (node: SyntaxNode, module: PathModule): string | null => {
  if (node.type === "member_expression" && node.childForFieldName("property")?.text === URL_PATH_MEMBER) return urlPathOf(node.childForFieldName("object"))
  if (node.type !== "call_expression") return null
  const callee = node.childForFieldName("function")
  if (callee === null) return null
  if (callee.type === "identifier" && module.urlReaders.has(callee.text)) return urlPathOf(argumentsOf(node)[0] ?? null)
  return isJoiningCallee(callee, module) ? joinedArguments(node) : null
}
