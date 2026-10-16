import { parseWithGrammar, type SyntaxNode } from "@/ast-graph/parser"

const SCOPE_NODES: ReadonlySet<string> = new Set([
  "function_definition",
  "class_definition",
  "lambda",
  "list_comprehension",
  "set_comprehension",
  "dictionary_comprehension",
  "generator_expression",
])
const TARGET_GROUP_NODES: ReadonlySet<string> = new Set(["pattern_list", "tuple_pattern", "list_pattern", "tuple", "list", "list_splat_pattern"])
const ASSIGNING_NODES: ReadonlySet<string> = new Set(["assignment", "augmented_assignment", "for_statement"])

const NAME_FIELD = "name"
const ALIAS_FIELD = "alias"
const LEFT_FIELD = "left"
const MODULE_FIELD = "module_name"
const IDENTIFIER_NODE = "identifier"
const ALIASED_IMPORT_NODE = "aliased_import"
const RELATIVE_IMPORT_NODE = "relative_import"
const IMPORT_PREFIX_NODE = "import_prefix"
const OWN_PACKAGE_PREFIX = "."
const MODULE_PATH_SEPARATOR = "."

const namesInTarget = (target: SyntaxNode | null): string[] => {
  if (target === null) return []
  if (target.type === IDENTIFIER_NODE) return [target.text]
  return TARGET_GROUP_NODES.has(target.type) ? target.namedChildren.flatMap(namesInTarget) : []
}

const importedNameOf = (name: SyntaxNode): string =>
  name.type === ALIASED_IMPORT_NODE ? (name.childForFieldName(ALIAS_FIELD)?.text ?? "") : name.text

const boundModuleNameOf = (name: SyntaxNode): string =>
  name.type === ALIASED_IMPORT_NODE ? importedNameOf(name) : name.text.split(MODULE_PATH_SEPARATOR)[0]

const isOwnPackageImport = (statement: SyntaxNode): boolean => {
  const moduleName = statement.childForFieldName(MODULE_FIELD)
  return moduleName?.type === RELATIVE_IMPORT_NODE
    && moduleName.namedChildren.length === 1
    && moduleName.namedChildren[0].type === IMPORT_PREFIX_NODE
    && moduleName.namedChildren[0].text === OWN_PACKAGE_PREFIX
}

const namesBoundBy = (node: SyntaxNode): string[] => {
  if (node.type === "function_definition" || node.type === "class_definition") return namesInTarget(node.childForFieldName(NAME_FIELD))
  if (ASSIGNING_NODES.has(node.type)) return namesInTarget(node.childForFieldName(LEFT_FIELD))
  if (node.type === "as_pattern_target") return node.namedChildren.flatMap(namesInTarget)
  if (node.type === "named_expression") return namesInTarget(node.childForFieldName(NAME_FIELD))
  if (node.type === "import_statement") return node.childrenForFieldName(NAME_FIELD).map(boundModuleNameOf)
  if (node.type === "import_from_statement" && !isOwnPackageImport(node)) return node.childrenForFieldName(NAME_FIELD).map(importedNameOf)
  return []
}

const namesBoundIn = (node: SyntaxNode): string[] => [
  ...namesBoundBy(node),
  ...(SCOPE_NODES.has(node.type) ? [] : node.namedChildren.flatMap(namesBoundIn)),
]

export const readModuleNames = (text: string): ReadonlySet<string> =>
  new Set(parseWithGrammar("python", text).rootNode.namedChildren.flatMap(namesBoundIn).filter((name) => name !== ""))
