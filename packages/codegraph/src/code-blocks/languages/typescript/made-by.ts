import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxNode } from "@/ast-graph/parser"
import { findLibrary } from "@/catalogue/find-library"
import type { BlockMade, CatalogueLibrary } from "@/catalogue/types"
import type { CodeBlockCatalogue } from "@/code-blocks/types"
import { resolutionOf, type FileOutline } from "./outline"

export interface MadeBlock {
  readonly type: DeclaredType
  readonly catalogue: CodeBlockCatalogue
}

type DeclaredType = Extract<BlockMade, "state" | "derived">

interface CalledExport {
  readonly specifier: string
  readonly name: string
}

const CALL_TYPE = "call_expression"
const NAME_TYPE = "identifier"
const MEMBER_TYPE = "member_expression"
const DEFAULT_EXPORT = "default"
const WHOLE_LIBRARY: ReadonlySet<string> = new Set([NAMESPACE_IMPORT, DEFAULT_EXPORT])
const DECLARED_TYPES: ReadonlySet<string> = new Set<DeclaredType>(["state", "derived"])

const isDeclaredType = (made: BlockMade | undefined): made is DeclaredType => made !== undefined && DECLARED_TYPES.has(made)

const importedBy = (name: SyntaxNode, outline: FileOutline): CalledExport | null => {
  const resolution = name.type === NAME_TYPE ? resolutionOf(outline, name) : null
  if (resolution?.kind !== "import") return null
  return { specifier: resolution.variable.specifier, name: resolution.variable.importedName }
}

const calledExportOf = (callee: SyntaxNode, outline: FileOutline): CalledExport | null => {
  if (callee.type !== MEMBER_TYPE) return importedBy(callee, outline)
  const object = callee.childForFieldName("object")
  const library = object === null ? null : importedBy(object, outline)
  const member = callee.childForFieldName("property")?.text ?? null
  return library !== null && member !== null && WHOLE_LIBRARY.has(library.name) ? { specifier: library.specifier, name: member } : null
}

export const findMadeBlock = (value: SyntaxNode, outline: FileOutline, libraries: readonly CatalogueLibrary[]): MadeBlock | null => {
  const callee = value.type === CALL_TYPE ? value.childForFieldName("function") : null
  const called = callee === null ? null : calledExportOf(callee, outline)
  const library = called === null ? null : findLibrary(libraries, called.specifier)
  const pattern = library?.patterns.find((candidate) => candidate.kind === "call" && candidate.name === called?.name)
  const made = pattern?.kind === "call" ? pattern.makes : undefined
  if (called === null || !isDeclaredType(made)) return null
  return { type: made, catalogue: { specifier: called.specifier, name: called.name, runs: null, path: null, method: null, event: null, certainty: "proven" } }
}
