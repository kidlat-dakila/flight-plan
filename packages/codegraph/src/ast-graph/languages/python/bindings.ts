import { queryCaptures, type QueryCapture, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { DeclarationType, FileVariable, SourceRange, SymbolSpace, VariableType } from "@/ast-graph/types"
import { groupBy } from "@/core/group-by"
import { importedNamesOf, type ImportedName } from "./import-statements"
import { targetNamesIn } from "./patterns"
import { functionAround, isClass, isFunction, lastingScopeOwnerOf, scopeOf, scopeOwnerOf, typeParameterOwnerOf } from "./scopes"

export const PYTHON_GRAMMAR = "python"
export const PYTHON_SPACES: readonly SymbolSpace[] = ["value"]

interface Traits {
  readonly declarationType: DeclarationType
  readonly type: VariableType
}

interface Site {
  readonly name: SyntaxNode
  readonly text: string
  readonly start: number
  readonly owner: SyntaxNode
  readonly traits: Traits
  readonly imported: ImportedName | null
  readonly isMovable: boolean
}

export interface ImportBinding extends ImportedName {
  readonly range: SourceRange
  readonly scope: SourceRange
}

export interface ClassName {
  readonly name: SyntaxNode
  readonly text: string
  readonly owner: SyntaxNode
}

export interface Bindings {
  readonly variables: readonly FileVariable[]
  readonly imports: readonly ImportBinding[]
  readonly classNames: readonly ClassName[]
}

type ReadSites = (node: SyntaxNode) => Site[]

const FUNCTION: Traits = { declarationType: "inline-declaration", type: "function" }
const CLASS: Traits = { declarationType: "inline-declaration", type: "class" }
const VALUE: Traits = { declarationType: "inline-declaration", type: "primitive" }
const ARGUMENT: Traits = { declarationType: "argument", type: "primitive" }
const TYPE: Traits = { declarationType: "inline-declaration", type: "type" }
const TYPE_ARGUMENT: Traits = { declarationType: "argument", type: "type" }

const GLOBAL_CAPTURE = "global"
const NONLOCAL_CAPTURE = "nonlocal"
const SINGLE_NAME_TYPE = "identifier"
const FUNCTION_VALUE_TYPE = "lambda"
const IGNORED_NAME = "_"

const PARAMETER_FORMS = [
  "(identifier) @parameter",
  "(default_parameter name: (identifier) @parameter)",
  "(typed_default_parameter name: (identifier) @parameter)",
  "(typed_parameter . (identifier) @parameter)",
  "(typed_parameter (list_splat_pattern (identifier) @parameter))",
  "(typed_parameter (dictionary_splat_pattern (identifier) @parameter))",
  "(list_splat_pattern (identifier) @parameter)",
  "(dictionary_splat_pattern (identifier) @parameter)",
]
const TYPE_PARAMETER_FORMS = [
  "(type (identifier) @typeParameter)",
  "(type (constrained_type . (type (identifier) @typeParameter)))",
  "(type (splat_type (identifier) @typeParameter))",
]

const formsIn = (holder: string, forms: readonly string[]): string => forms.map((form) => `(${holder} ${form})`).join("\n")

const BINDING_QUERY = `
(function_definition name: (identifier) @function)
(class_definition name: (identifier) @class)
${formsIn("parameters", PARAMETER_FORMS)}
${formsIn("lambda_parameters", PARAMETER_FORMS)}
(assignment left: (_) @target)
(augmented_assignment left: (identifier) @name)
(named_expression name: (identifier) @lasting)
(for_statement left: (_) @target)
(for_in_clause left: (_) @target)
(as_pattern alias: (as_pattern_target (_) @target))
(case_pattern (dotted_name . (identifier) @name .))
(keyword_pattern (dotted_name . (identifier) @name .))
(splat_pattern (identifier) @name)
(case_pattern (as_pattern (identifier) @name))
(type_alias_statement left: (type (identifier) @alias))
(type_alias_statement left: (type (generic_type . (identifier) @alias)))
${formsIn("function_definition type_parameters: (type_parameter", TYPE_PARAMETER_FORMS.map((form) => `${form})`))}
${formsIn("class_definition type_parameters: (type_parameter", TYPE_PARAMETER_FORMS.map((form) => `${form})`))}
${formsIn("type_alias_statement left: (type (generic_type (type_parameter", TYPE_PARAMETER_FORMS.map((form) => `${form})))`))}
(import_statement) @import
(import_from_statement) @import
(global_statement (identifier) @${GLOBAL_CAPTURE})
(nonlocal_statement (identifier) @${NONLOCAL_CAPTURE})
`

const siteOf = (name: SyntaxNode, owner: SyntaxNode, traits: Traits): Site => ({
  name,
  text: name.text,
  start: name.startIndex,
  owner,
  traits,
  imported: null,
  isMovable: true,
})

const traitsOfTarget = (target: SyntaxNode): Traits => {
  const value = target.parent?.childForFieldName("right") ?? null
  return target.type === SINGLE_NAME_TYPE && value?.type === FUNCTION_VALUE_TYPE ? FUNCTION : VALUE
}

const readDefinition
  = (traits: Traits): ReadSites =>
    (name) => (name.parent === null ? [] : [siteOf(name, scopeOwnerOf(name.parent), traits)])

const readTarget: ReadSites = (target) => {
  const traits = traitsOfTarget(target)
  return targetNamesIn(target).map((name) => siteOf(name, scopeOwnerOf(name), traits))
}

const readImport: ReadSites = (statement) =>
  importedNamesOf(statement).map((imported) => ({ ...siteOf(imported.name, scopeOwnerOf(statement), VALUE), imported }))

const READERS: ReadonlyMap<string, ReadSites> = new Map<string, ReadSites>([
  ["function", readDefinition(FUNCTION)],
  ["class", readDefinition(CLASS)],
  ["parameter", (name) => [{ ...siteOf(name, scopeOwnerOf(name), ARGUMENT), isMovable: false }]],
  ["target", readTarget],
  ["name", (name) => [siteOf(name, scopeOwnerOf(name), VALUE)]],
  ["lasting", (name) => [siteOf(name, lastingScopeOwnerOf(name), VALUE)]],
  ["alias", (name) => [siteOf(name, scopeOwnerOf(name), TYPE)]],
  ["typeParameter", (name) => [{ ...siteOf(name, typeParameterOwnerOf(name), TYPE_ARGUMENT), isMovable: false }]],
  ["import", readImport],
])

const directiveKey = (owner: SyntaxNode, name: string): string => [owner.id, name].join(":")

const DIRECTIVE_TARGETS: ReadonlyMap<string, (declaredIn: SyntaxNode) => SyntaxNode> = new Map([
  [GLOBAL_CAPTURE, (declaredIn: SyntaxNode) => declaredIn.tree.rootNode],
  [NONLOCAL_CAPTURE, functionAround],
])

const ownersMovedBy = (captures: readonly QueryCapture[]): ReadonlyMap<string, SyntaxNode> =>
  new Map(
    captures.flatMap(({ name, node }) => {
      const targetOf = DIRECTIVE_TARGETS.get(name)
      if (targetOf === undefined) return []
      const declaredIn = functionAround(node)
      return [[directiveKey(declaredIn, node.text), targetOf(declaredIn)] as const]
    }),
  )

interface ScopedSite extends Site {
  readonly scope: SyntaxNode | null
}

const scopeOfSite = (site: Site): SyntaxNode | null => {
  if (site.traits === TYPE_ARGUMENT) return site.owner
  return isClass(site.owner) ? null : scopeOf(site.owner)
}

const variableOf = (site: Site, scope: SyntaxNode): FileVariable => ({
  name: site.text,
  range: rangeOf(site.name),
  scope: rangeOf(scope),
  spaces: PYTHON_SPACES,
  ...site.traits,
})

const importOf = (site: Site, scope: SyntaxNode): ImportBinding[] =>
  site.imported === null ? [] : [{ ...site.imported, range: rangeOf(site.name), scope: rangeOf(scope) }]

const bindingsOfGroup = (sites: readonly ScopedSite[]): Bindings => {
  const [first] = sites
  const { scope } = first
  if (scope === null) return { variables: [], imports: [], classNames: sites.map(({ name, text, owner }) => ({ name, text, owner })) }
  if (first.imported === null) return { variables: [variableOf(first, scope)], imports: [], classNames: [] }
  return { variables: [], imports: sites.flatMap((site) => importOf(site, scope)), classNames: [] }
}

export const readBindings = (tree: SyntaxTree): Bindings => {
  const captures = queryCaptures(PYTHON_GRAMMAR, tree.rootNode, BINDING_QUERY)
  const movedOwners = ownersMovedBy(captures)
  const sites = captures
    .flatMap(({ name, node }) => READERS.get(name)?.(node) ?? [])
    .filter((site) => site.text !== IGNORED_NAME)
    .map((site): ScopedSite => {
      const moved = site.isMovable && isFunction(site.owner) ? movedOwners.get(directiveKey(site.owner, site.text)) : undefined
      const placed = moved === undefined ? site : { ...site, owner: moved }
      return { ...placed, scope: scopeOfSite(placed) }
    })
    .sort((one, two) => one.start - two.start)
  const groups = groupBy(sites, (site) => [site.text, (site.scope ?? site.owner).id].join("@"))
  const bindings = [...groups.values()].map(bindingsOfGroup)
  return {
    variables: bindings.flatMap((binding) => binding.variables),
    imports: bindings.flatMap((binding) => binding.imports),
    classNames: bindings.flatMap((binding) => binding.classNames),
  }
}
