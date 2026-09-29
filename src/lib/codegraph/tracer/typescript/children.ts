/**
 * The way down from a change: what a declaration calls or renders.
 *
 * The climb ({@link ./callGraph}) answers "who calls this". This answers the
 * other question for the same declaration: which functions and components of
 * the repository its body reaches. Each call `name(...)`, namespace call
 * `ns.name(...)` and JSX element `<Name …>` / `<ns.Name …>` in the body is
 * resolved through the variable its name means (so a parameter or a local of
 * the same name is not mistaken for the import), then through imports and
 * barrels to the declaration that defines it.
 *
 * What is left out: calls of anything that is not a top-level declaration of
 * the repository (a package, a parameter, a local helper, a method on `this`
 * or on an object), and a call back to a declaration already on the way down.
 */
import { idOf, keyOf } from "../callerTree"
import type { CodeRef, DiagramNode, Pos, Range } from "../../types"
import { exportBindingsOf, literal } from "./bindings"
import type { Resolver } from "./callGraph"
import { calleeOf } from "./callSites"
import { rangeOf, textOf, type Node, type Parsed } from "./estree"

/**
 * How many levels down from a changed declaration are followed: one, what it
 * calls directly. A second level is mostly shared helpers that say little
 * about the change and doubles the diagram again.
 */
export const CHILD_DEPTH = 1

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)
const contains = (within: Range, pos: Pos): boolean => atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

/** One reach of the body: the name node to resolve, the member name when it is a namespace call, and where. */
type Site = { name: Node; member: string | null; at: Range }

/** The calls and JSX elements inside a range, in source order. */
function sitesIn(parsed: Parsed, within: Range): Site[] {
  const out: Site[] = []
  for (const node of parsed.nodes) {
    let site: Site | null = null
    const callee = calleeOf(node)
    if (callee?.type === "Identifier") {
      site = { name: callee, member: null, at: rangeOf(parsed, callee) }
    } else if (callee?.type === "MemberExpression" && callee.computed !== true && (callee.object as Node).type === "Identifier") {
      const property = callee.property as Node
      site = { name: callee.object as Node, member: textOf(parsed, property), at: rangeOf(parsed, property) }
    } else if (node.type === "JSXOpeningElement") {
      const element = node.name as Node
      if (element.type === "JSXIdentifier" && /^[A-Z]/.test(element.name as string)) {
        site = { name: element, member: null, at: rangeOf(parsed, element) }
      } else if (element.type === "JSXMemberExpression" && (element.object as Node).type === "JSXIdentifier") {
        const property = element.property as Node
        site = { name: element.object as Node, member: property.name as string, at: rangeOf(parsed, property) }
      }
    }
    if (site !== null && contains(within, site.at.start)) out.push(site)
  }
  return out
}

export function childrenFinder(resolver: Resolver): (root: CodeRef, depth?: number) => Promise<DiagramNode[]> {
  /** The declaration a file exports under a name, following renames and `export … from`. */
  const exported = async (file: string, name: string, seen: Set<string>): Promise<CodeRef | null> => {
    const key = `${file}#${name}`
    if (seen.has(key)) return null
    seen.add(key)
    const declarations = await resolver.declarationsOf(file)
    const byName = (local: string): CodeRef | null => declarations.find((one) => one.name === local) ?? null
    if (name !== "default") {
      const direct = byName(name)
      if (direct !== null) return direct
    }
    const parsed = await resolver.parsedOf(file)
    if (parsed === null) return null
    for (const binding of exportBindingsOf(parsed)) {
      if (binding.kind === "local" && binding.exported === name) {
        const found = byName(binding.local)
        if (found !== null) return found
      } else if (binding.kind === "default" && name === "default" && binding.local !== null) {
        const found = byName(binding.local)
        if (found !== null) return found
      } else if ((binding.kind === "re-export" && binding.exported === name) || binding.kind === "star") {
        const to = await resolver.resolve(file, binding.specifier)
        const found = to === null ? null : await exported(to, binding.kind === "star" ? name : binding.imported, seen)
        if (found !== null) return found
      }
    }
    return null
  }

  /** The repository declaration a site reaches, or null. */
  const declarationOf = async (file: string, parsed: Parsed, site: Site): Promise<CodeRef | null> => {
    const scopes = parsed.scopes()
    const variable = scopes.variableOf(site.name)
    const definition = variable === null ? null : scopes.definitionOf(variable)
    if (definition === null) return null
    if (definition.type === "ImportBinding") {
      const specifier = literal(parsed, definition.parent?.source as Node | undefined)
      const to = specifier === null ? null : await resolver.resolve(file, specifier)
      if (to === null) return null
      const part = definition.node
      if (part.type === "ImportNamespaceSpecifier") return site.member === null ? null : exported(to, site.member, new Set())
      if (site.member !== null) return null
      const name = part.type === "ImportSpecifier" ? textOf(parsed, part.imported as Node) : "default"
      return exported(to, name, new Set())
    }
    // A declaration of this file: only a top-level one is a node of the diagram.
    if (site.member !== null || variable !== scopes.moduleVariable(variable?.name ?? "")) return null
    if (definition.type !== "FunctionName" && definition.type !== "Variable") return null
    return (await resolver.declarationsOf(file)).find((one) => one.name === variable?.name) ?? null
  }

  const childrenOf = async (code: CodeRef, depth: number, path: ReadonlySet<string>): Promise<DiagramNode[]> => {
    if (depth <= 0) return []
    const parsed = await resolver.parsedOf(code.file)
    if (parsed === null) return []
    const out: DiagramNode[] = []
    const kept = new Set<string>()
    for (const site of sitesIn(parsed, code.enclosingRange)) {
      const target = await declarationOf(code.file, parsed, site)
      if (target === null) continue
      const key = keyOf(target)
      if (path.has(key) || kept.has(key)) continue
      kept.add(key)
      const below = await childrenOf(target, depth - 1, new Set(path).add(key))
      out.push({
        id: idOf(target),
        code: target,
        calledAt: site.at,
        via: "call",
        callers: [],
        ...(below.length > 0 ? { children: below } : {}),
      })
    }
    return out
  }

  return (root, depth = CHILD_DEPTH) => childrenOf(root, depth, new Set([keyOf(root)]))
}
