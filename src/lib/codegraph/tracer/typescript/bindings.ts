/**
 * The import and export bindings of one file.
 *
 * The file-level tracer only needs *which file* a specifier names, so it reads
 * specifiers alone. The declaration climb needs more: to prove a call to a local
 * name is a call to the target, it must know which exported name that local
 * stands for, and to climb through a barrel it must know what a file re-exports
 * and from where. That is what these two extractors give — the name-level facts
 * `specifiersOf` deliberately skips.
 *
 * Scope: `import`/`export` statements. A `const { x } = require("…")` binding is
 * not read (a known limit, matching the file tracer's static focus).
 */
import { textOf, type Node, type Parsed } from "./estree"

/** A name brought into a file by an import. */
export type ImportBinding = {
  /** The name as used in this file. */
  local: string
  /** The exported name it refers to; `"default"` or `"*"` for the two specials. */
  imported: string
  kind: "named" | "default" | "namespace"
  /** The module specifier it comes from. */
  specifier: string
  /** A wholly type-only import, or an inline `type` on this specifier. */
  typeOnly: boolean
  /** The 1-based line the import is written on. */
  line: number
}

/** A name a file exposes, or passes through from another module. */
export type ExportBinding =
  /** `export const x` / `export { a as b }` (no source): a name defined here. */
  | { kind: "local"; exported: string; local: string }
  /** `export { a as b } from "./y"`: a name passed through from another module. */
  | { kind: "re-export"; exported: string; imported: string; specifier: string }
  /** `export * from "./y"`: everything that module exports, passed through. */
  | { kind: "star"; specifier: string }
  /** `export default …`: the local name when there is one, else null (anonymous). */
  | { kind: "default"; local: string | null }

/** The text of a string literal as written, without its quotes; null when it is not one. */
export function literal(parsed: Parsed, node: Node | null | undefined): string | null {
  if (node === null || node === undefined || node.type !== "Literal" || typeof node.value !== "string") return null
  return parsed.source.slice(node.start + 1, node.end - 1)
}

export function importBindingsOf(parsed: Parsed): ImportBinding[] {
  const out: ImportBinding[] = []
  for (const statement of parsed.program.body as Node[]) {
    if (statement.type !== "ImportDeclaration") continue
    const specifier = literal(parsed, statement.source as Node)
    if (specifier === null) continue
    const line = parsed.positionAt(statement.start).line
    const wholeType = statement.importKind === "type"

    for (const part of statement.specifiers as Node[]) {
      const local = textOf(parsed, part.local as Node)
      if (part.type === "ImportDefaultSpecifier") {
        out.push({ local, imported: "default", kind: "default", specifier, typeOnly: wholeType, line })
      } else if (part.type === "ImportNamespaceSpecifier") {
        out.push({ local, imported: "*", kind: "namespace", specifier, typeOnly: wholeType, line })
      } else if (part.type === "ImportSpecifier") {
        out.push({
          local,
          imported: textOf(parsed, part.imported as Node),
          kind: "named",
          specifier,
          typeOnly: wholeType || part.importKind === "type",
          line,
        })
      }
    }
  }
  return out
}

/** The names an exported declaration introduces (`export const a, b` → both). */
function exportedNames(declaration: Node): string[] {
  if (declaration.declare === true) return []
  switch (declaration.type) {
    case "FunctionDeclaration":
    case "ClassDeclaration": {
      const id = declaration.id as Node | null
      return id === null ? [] : [id.name as string]
    }
    case "VariableDeclaration": {
      const names: string[] = []
      for (const declarator of declaration.declarations as Node[]) {
        const id = declarator.id as Node
        if (id.type === "Identifier") names.push(id.name as string)
      }
      return names
    }
  }
  return []
}

export function exportBindingsOf(parsed: Parsed): ExportBinding[] {
  const out: ExportBinding[] = []
  for (const statement of parsed.program.body as Node[]) {
    // `export default …` — a value or a declaration.
    if (statement.type === "ExportDefaultDeclaration") {
      const target = statement.declaration as Node
      const local =
        target.type === "Identifier"
          ? (target.name as string)
          : ((target.id as Node | null | undefined)?.name as string | undefined) ?? null
      out.push({ kind: "default", local })
      continue
    }

    if (statement.type === "ExportAllDeclaration") {
      const specifier = literal(parsed, statement.source as Node)
      // `export * from` (not `export * as ns`)
      if (specifier !== null && statement.exported === null) out.push({ kind: "star", specifier })
      continue
    }

    if (statement.type !== "ExportNamedDeclaration") continue
    const declaration = statement.declaration as Node | null
    if (declaration !== null) {
      for (const name of exportedNames(declaration)) out.push({ kind: "local", exported: name, local: name })
      continue
    }

    const source = literal(parsed, statement.source as Node | null)
    for (const spec of statement.specifiers as Node[]) {
      const name = textOf(parsed, spec.local as Node)
      const exported = textOf(parsed, spec.exported as Node)
      if (source !== null) out.push({ kind: "re-export", exported, imported: name, specifier: source })
      else out.push({ kind: "local", exported, local: name })
    }
  }
  return out
}
