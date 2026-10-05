import type { Node, Tree } from "web-tree-sitter"

export interface PyImport {
  local: string
  imported: string
  module: string
  level: number
  typeOnly: boolean
  line: number
}

export interface PyReExport { exported: string, imported: string, module: string, level: number }

interface Bound { local: string, imported: string, module: string, level: number }

function isTypeCheckingGuarded(statement: Node): boolean {
  for (let node = statement.parent; node !== null; node = node.parent) {
    if (node.type !== "if_statement") continue
    const condition = node.childForFieldName("condition")?.text
    if (condition === "TYPE_CHECKING" || condition === "typing.TYPE_CHECKING") return true
  }
  return false
}

function moduleOf(moduleName: Node | null): { module: string, level: number } {
  if (moduleName === null) return { module: "", level: 0 }
  if (moduleName.type === "relative_import") {
    const prefix = moduleName.namedChildren.find((child) => child.type === "import_prefix")
    const level = prefix === undefined ? 0 : (prefix.text.match(/\./g) ?? []).length
    const dotted = moduleName.namedChildren.find((child) => child.type === "dotted_name")
    return { module: dotted?.text ?? "", level }
  }
  return { module: moduleName.text, level: 0 }
}

function fromNameOf(node: Node): { local: string, imported: string } {
  if (node.type === "aliased_import") {
    const imported = node.childForFieldName("name")?.text ?? ""
    const local = node.childForFieldName("alias")?.text ?? imported
    return { local, imported }
  }
  return { local: node.text, imported: node.text }
}

function moduleNameOf(node: Node): { local: string, module: string } {
  if (node.type === "aliased_import") {
    const module = node.childForFieldName("name")?.text ?? ""
    const local = node.childForFieldName("alias")?.text ?? module
    return { local, module }
  }
  return { local: node.text, module: node.text }
}

function plainImport(statement: Node): Bound[] {
  return statement.childrenForFieldName("name").map((name) => {
    const { local, module } = moduleNameOf(name)
    return { local, imported: "", module, level: 0 }
  })
}

function fromImport(statement: Node): Bound[] {
  const { module, level } = moduleOf(statement.childForFieldName("module_name"))
  const named = statement.childrenForFieldName("name").map((name) => {
    const { local, imported } = fromNameOf(name)
    return { local, imported, module, level }
  })
  const isWildcard = statement.namedChildren.some((child) => child.type === "wildcard_import")
  return isWildcard ? [...named, { local: "*", imported: "*", module, level }] : named
}

function importStatementsIn(node: Node): Node[] {
  const isImport = node.type === "import_statement" || node.type === "import_from_statement"
  return isImport ? [node] : node.namedChildren.flatMap(importStatementsIn)
}

export function importBindingsOf(tree: Tree): PyImport[] {
  return importStatementsIn(tree.rootNode).flatMap((statement) => {
    const line = statement.startPosition.row + 1
    const isTypeOnly = isTypeCheckingGuarded(statement)
    const bound = statement.type === "import_statement" ? plainImport(statement) : fromImport(statement)
    return bound.map((one) => ({ ...one, typeOnly: isTypeOnly, line }))
  })
}

export function reExportsOf(tree: Tree): PyReExport[] {
  return importStatementsIn(tree.rootNode)
    .filter((statement) => statement.type === "import_from_statement")
    .flatMap(fromImport)
    .filter((one) => one.imported !== "*")
    .map((one) => ({ exported: one.local, imported: one.imported, module: one.module, level: one.level }))
}
