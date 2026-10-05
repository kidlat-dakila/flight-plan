import { reduceInSequence } from "@/core/sequence"
import { idOf, keyOf } from "@/core/tracer/caller-tree"
import type { CodeRef, DiagramNode, Pos, Range } from "@/core/types"
import { exportBindingsOf, literal, type ExportBinding } from "./bindings"
import type { Resolver } from "./call-graph"
import { calleeOf } from "./call-sites"
import { rangeOf, textOf, type Parsed } from "./estree"
import { childAt, textAt, type Node } from "./node"

export const CHILD_DEPTH = 1

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)
const contains = (within: Range, pos: Pos): boolean => atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

interface Site { name: Node, member: string | null, at: Range }
interface ExportSearch { found: CodeRef | null, seen: ReadonlySet<string> }
interface Kept { key: string, site: Site, target: CodeRef }

const COMPONENT_NAME = /^[A-Z]/

function memberSiteOf(parsed: Parsed, expression: Node, objectType: string): Site | null {
  const object = childAt(expression, "object")
  const property = childAt(expression, "property")
  if (object?.type !== objectType || property === null) return null
  return { name: object, member: textOf(parsed, property), at: rangeOf(parsed, property) }
}

function renderSiteOf(parsed: Parsed, node: Node): Site | null {
  const element = node.type === "JSXOpeningElement" ? childAt(node, "name") : null
  if (element?.type === "JSXIdentifier" && COMPONENT_NAME.test(textAt(element, "name") ?? "")) {
    return { name: element, member: null, at: rangeOf(parsed, element) }
  }
  return element?.type === "JSXMemberExpression" ? memberSiteOf(parsed, element, "JSXIdentifier") : null
}

function siteOf(parsed: Parsed, node: Node): Site | null {
  const callee = calleeOf(node)
  if (callee?.type === "Identifier") return { name: callee, member: null, at: rangeOf(parsed, callee) }
  const called = callee?.type === "MemberExpression" && callee.computed !== true ? memberSiteOf(parsed, callee, "Identifier") : null
  return called ?? renderSiteOf(parsed, node)
}

function sitesIn(parsed: Parsed, within: Range): Site[] {
  return parsed.nodes.flatMap((node) => {
    const site = siteOf(parsed, node)
    return site !== null && contains(within, site.at.start) ? [site] : []
  })
}

const importedNameOf = (parsed: Parsed, part: Node): string => {
  const imported = part.type === "ImportSpecifier" ? childAt(part, "imported") : null
  return imported === null ? "default" : textOf(parsed, imported)
}

export function childrenFinder(resolver: Resolver): (root: CodeRef, depth?: number) => Promise<DiagramNode[]> {
  const followed = async (
    file: string,
    name: string,
    binding: ExportBinding,
    declarations: readonly CodeRef[],
    seen: ReadonlySet<string>,
  ): Promise<ExportSearch> => {
    const byName = (local: string): CodeRef | null => declarations.find((one) => one.name === local) ?? null
    if (binding.kind === "local") return { found: binding.exported === name ? byName(binding.local) : null, seen }
    if (binding.kind === "default") return { found: name === "default" && binding.local !== null ? byName(binding.local) : null, seen }
    if (binding.kind === "re-export" && binding.exported !== name) return { found: null, seen }
    const to = await resolver.resolve(file, binding.specifier)
    return to === null ? { found: null, seen } : exported(to, binding.kind === "star" ? name : binding.imported, seen)
  }

  const exported = async (file: string, name: string, seenBefore: ReadonlySet<string>): Promise<ExportSearch> => {
    const key = `${file}#${name}`
    if (seenBefore.has(key)) return { found: null, seen: seenBefore }
    const seen = new Set(seenBefore).add(key)
    const declarations = await resolver.declarationsOf(file)
    const direct = name === "default" ? null : (declarations.find((one) => one.name === name) ?? null)
    if (direct !== null) return { found: direct, seen }
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return { found: null, seen }
    return reduceInSequence<ExportBinding, ExportSearch>(
      exportBindingsOf(parsed),
      async (held, binding) => (held.found === null ? followed(file, name, binding, declarations, held.seen) : held),
      { found: null, seen },
    )
  }

  const exportedFrom = async (file: string, name: string): Promise<CodeRef | null> => (await exported(file, name, new Set())).found

  const importedDeclarationOf = async (file: string, parsed: Parsed, site: Site, part: Node, source: Node | null): Promise<CodeRef | null> => {
    const specifier = literal(parsed, source)
    const to = specifier === null ? null : await resolver.resolve(file, specifier)
    if (to === null) return null
    if (part.type === "ImportNamespaceSpecifier") return site.member === null ? null : exportedFrom(to, site.member)
    return site.member === null ? exportedFrom(to, importedNameOf(parsed, part)) : null
  }

  const declarationOf = async (file: string, parsed: Parsed, site: Site): Promise<CodeRef | null> => {
    const scopes = parsed.scopes()
    const variable = scopes.variableOf(site.name)
    const definition = variable === null ? null : scopes.definitionOf(variable)
    if (variable === null || definition === null) return null
    if (definition.type === "ImportBinding") {
      const source = definition.parent === null ? null : childAt(definition.parent, "source")
      return importedDeclarationOf(file, parsed, site, definition.node, source)
    }
    if (site.member !== null || variable !== scopes.moduleVariable(variable.name)) return null
    if (definition.type !== "FunctionName" && definition.type !== "Variable") return null
    return (await resolver.declarationsOf(file)).find((one) => one.name === variable.name) ?? null
  }

  const childrenOf = async (code: CodeRef, depth: number, path: ReadonlySet<string>): Promise<DiagramNode[]> => {
    if (depth <= 0) return []
    const parsed = await resolver.parsedOf(code.file)
    if (parsed === null) return []
    const targets = await Promise.all(
      sitesIn(parsed, code.enclosingRange).map(async (site) => ({ site, target: await declarationOf(code.file, parsed, site) })),
    )
    const kept = targets.reduce<readonly Kept[]>((held, { site, target }) => {
      if (target === null) return held
      const key = keyOf(target)
      return path.has(key) || held.some((one) => one.key === key) ? held : [...held, { key, site, target }]
    }, [])
    return Promise.all(
      kept.map(async ({ key, site, target }): Promise<DiagramNode> => {
        const below = await childrenOf(target, depth - 1, new Set(path).add(key))
        return {
          id: idOf(target),
          code: target,
          calledAt: site.at,
          via: "call",
          callers: [],
          ...(below.length > 0 ? { children: below } : {}),
        }
      }),
    )
  }

  return async (root, depth = CHILD_DEPTH) => childrenOf(root, depth, new Set([keyOf(root)]))
}
