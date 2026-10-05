import { textOf, type Parsed } from "./estree"
import { childAt, childrenAt, textAt, type Node } from "./node"

export interface ImportBinding {
  local: string
  imported: string
  kind: "named" | "default" | "namespace"
  specifier: string
  typeOnly: boolean
  line: number
}

export type ExportBinding
  = | { kind: "local", exported: string, local: string }
    | { kind: "re-export", exported: string, imported: string, specifier: string }
    | { kind: "star", specifier: string }
    | { kind: "default", local: string | null }

export function literal(parsed: Parsed, node: Node | null | undefined): string | null {
  if (node?.type !== "Literal" || typeof node.value !== "string") return null
  return parsed.source.slice(node.start + 1, node.end - 1)
}

interface ImportSource { specifier: string, isWholeType: boolean, line: number }

function importBindingOf(parsed: Parsed, part: Node, { specifier, isWholeType, line }: ImportSource): ImportBinding[] {
  const localNode = childAt(part, "local")
  if (localNode === null) return []
  const local = textOf(parsed, localNode)
  if (part.type === "ImportDefaultSpecifier") return [{ local, imported: "default", kind: "default", specifier, typeOnly: isWholeType, line }]
  if (part.type === "ImportNamespaceSpecifier") return [{ local, imported: "*", kind: "namespace", specifier, typeOnly: isWholeType, line }]
  const imported = childAt(part, "imported")
  if (part.type !== "ImportSpecifier" || imported === null) return []
  return [
    { local, imported: textOf(parsed, imported), kind: "named", specifier, typeOnly: isWholeType || part.importKind === "type", line },
  ]
}

export function importBindingsOf(parsed: Parsed): ImportBinding[] {
  return childrenAt(parsed.program, "body")
    .filter((statement) => statement.type === "ImportDeclaration")
    .flatMap((statement) => {
      const specifier = literal(parsed, childAt(statement, "source"))
      if (specifier === null) return []
      const source = { specifier, isWholeType: statement.importKind === "type", line: parsed.positionAt(statement.start).line }
      return childrenAt(statement, "specifiers").flatMap((part) => importBindingOf(parsed, part, source))
    })
}

const nameOf = (node: Node | null): string[] => {
  const name = node === null ? null : textAt(node, "name")
  return name === null ? [] : [name]
}

function exportedNames(declaration: Node): string[] {
  if (declaration.declare === true) return []
  if (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") return nameOf(childAt(declaration, "id"))
  if (declaration.type !== "VariableDeclaration") return []
  return childrenAt(declaration, "declarations").flatMap((declarator) => {
    const id = childAt(declarator, "id")
    return id?.type === "Identifier" ? nameOf(id) : []
  })
}

function defaultExportOf(statement: Node): ExportBinding {
  const target = childAt(statement, "declaration")
  const named = target?.type === "Identifier" ? target : target && childAt(target, "id")
  return { kind: "default", local: named === null ? null : textAt(named, "name") }
}

function namedExportsOf(parsed: Parsed, statement: Node): ExportBinding[] {
  const declaration = childAt(statement, "declaration")
  if (declaration !== null) return exportedNames(declaration).map((name) => ({ kind: "local", exported: name, local: name }))

  const source = literal(parsed, childAt(statement, "source"))
  return childrenAt(statement, "specifiers").flatMap((spec): ExportBinding[] => {
    const local = childAt(spec, "local")
    const exportedNode = childAt(spec, "exported")
    if (local === null || exportedNode === null) return []
    const name = textOf(parsed, local)
    const exported = textOf(parsed, exportedNode)
    return source === null ? [{ kind: "local", exported, local: name }] : [{ kind: "re-export", exported, imported: name, specifier: source }]
  })
}

function starExportOf(parsed: Parsed, statement: Node): ExportBinding[] {
  const specifier = literal(parsed, childAt(statement, "source"))
  return specifier !== null && statement.exported === null ? [{ kind: "star", specifier }] : []
}

export function exportBindingsOf(parsed: Parsed): ExportBinding[] {
  return childrenAt(parsed.program, "body").flatMap((statement): ExportBinding[] => {
    if (statement.type === "ExportDefaultDeclaration") return [defaultExportOf(statement)]
    if (statement.type === "ExportAllDeclaration") return starExportOf(parsed, statement)
    return statement.type === "ExportNamedDeclaration" ? namedExportsOf(parsed, statement) : []
  })
}
