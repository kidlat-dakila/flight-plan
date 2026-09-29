/**
 * The import bindings of one Python file, and the re-exports they imply.
 *
 * Mirrors `tracer/typescript/bindings.ts`'s `importBindingsOf`, but the
 * Python grammar shapes the facts differently: there is no single `import`
 * clause node to enumerate, module paths are dotted text rather than string
 * literals, and relative imports carry a dot count instead of a `./` prefix.
 * `import`/`from`-import statements are not confined to the module's top
 * level — `if TYPE_CHECKING:` and `try:` both commonly wrap one — so the
 * tree is walked recursively rather than over `rootNode.namedChildren` alone.
 *
 * `reExportsOf` reframes the same from-imports as what an `__init__.py`
 * re-exports (imported name → the module it came from), the barrel source a
 * later declaration climb follows to resolve `pkg.thing` through
 * `pkg/__init__.py`'s `from .sub import thing`.
 */
import type { Node, Tree } from "web-tree-sitter"

/** A name bound into a file by an import or from-import. */
export type PyImport = {
  /** The name bound in this file (the alias, when there is one). */
  local: string
  /** The attribute imported from the module; `"*"` for a wildcard, `""` for a bare `import pkg` module binding. */
  imported: string
  /** The dotted module path as written, with no leading dots. */
  module: string
  /** Relative-import dot count: 0 absolute, 1 `from .`, 2 `from ..`. */
  level: number
  /** Under an `if TYPE_CHECKING:` block. */
  typeOnly: boolean
  /** The 1-based line the import is written on. */
  line: number
}

/** A name an `__init__.py`-style file re-exports, and the module it came from. */
export type PyReExport = { exported: string; imported: string; module: string; level: number }

/** One name bound by a statement, before type-only/line is attached. */
type Bound = { local: string; imported: string; module: string; level: number }

/** Whether the statement sits under an `if TYPE_CHECKING:` (or `typing.TYPE_CHECKING`) block. */
function isTypeCheckingGuarded(statement: Node): boolean {
  for (let node = statement.parent; node !== null; node = node.parent) {
    if (node.type !== "if_statement") continue
    const condition = node.childForFieldName("condition")?.text
    if (condition === "TYPE_CHECKING" || condition === "typing.TYPE_CHECKING") return true
  }
  return false
}

/** The module path and relative-import level from an `import_from_statement`'s `module_name` field. */
function moduleOf(moduleName: Node | null): { module: string; level: number } {
  if (moduleName === null) return { module: "", level: 0 }
  if (moduleName.type === "relative_import") {
    const prefix = moduleName.namedChildren.find((child): child is Node => child?.type === "import_prefix")
    const level = prefix === undefined ? 0 : (prefix.text.match(/\./g) ?? []).length
    const dotted = moduleName.namedChildren.find((child): child is Node => child?.type === "dotted_name")
    return { module: dotted?.text ?? "", level }
  }
  return { module: moduleName.text, level: 0 } // dotted_name — an absolute module path
}

/** One imported name from a from-import's `name` field: `dotted_name` or `aliased_import`. */
function fromNameOf(node: Node): { local: string; imported: string } {
  if (node.type === "aliased_import") {
    const imported = node.childForFieldName("name")?.text ?? ""
    const local = node.childForFieldName("alias")?.text ?? imported
    return { local, imported }
  }
  return { local: node.text, imported: node.text }
}

/** One bound module from a plain import's `name` field: `dotted_name` or `aliased_import`. */
function moduleNameOf(node: Node): { local: string; module: string } {
  if (node.type === "aliased_import") {
    const module = node.childForFieldName("name")?.text ?? ""
    const local = node.childForFieldName("alias")?.text ?? module
    return { local, module }
  }
  return { local: node.text, module: node.text }
}

/** The names bound by `import a.b`, `import a.b as c`, ... (`level` is always 0 — plain imports are absolute). */
function plainImport(statement: Node): Bound[] {
  return statement.childrenForFieldName("name").map((name) => {
    const { local, module } = moduleNameOf(name)
    return { local, imported: "", module, level: 0 }
  })
}

/** The names bound by `from ...`, plus a wildcard entry for `from pkg import *`. */
function fromImport(statement: Node): Bound[] {
  const { module, level } = moduleOf(statement.childForFieldName("module_name"))
  const out = statement.childrenForFieldName("name").map((name) => {
    const { local, imported } = fromNameOf(name)
    return { local, imported, module, level }
  })
  const wildcard = statement.namedChildren.some((child) => child?.type === "wildcard_import")
  if (wildcard) out.push({ local: "*", imported: "*", module, level })
  return out
}

/** Every `import_statement`/`import_from_statement` in the tree, wherever it is nested. */
function forEachImport(node: Node, visit: (statement: Node) => void): void {
  if (node.type === "import_statement" || node.type === "import_from_statement") {
    visit(node) // neither statement can contain a nested import — no need to descend further
    return
  }
  for (const child of node.namedChildren) {
    if (child !== null) forEachImport(child, visit)
  }
}

export function importBindingsOf(tree: Tree): PyImport[] {
  const out: PyImport[] = []
  forEachImport(tree.rootNode, (statement) => {
    const line = statement.startPosition.row + 1
    const typeOnly = isTypeCheckingGuarded(statement)
    const bound = statement.type === "import_statement" ? plainImport(statement) : fromImport(statement)
    for (const one of bound) out.push({ ...one, typeOnly, line })
  })
  return out
}

export function reExportsOf(tree: Tree): PyReExport[] {
  const out: PyReExport[] = []
  forEachImport(tree.rootNode, (statement) => {
    if (statement.type !== "import_from_statement") return
    for (const one of fromImport(statement)) {
      if (one.imported === "*") continue // a wildcard names no specific re-export
      out.push({ exported: one.local, imported: one.imported, module: one.module, level: one.level })
    }
  })
  return out
}
