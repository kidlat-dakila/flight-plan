import type { Pos, Range } from "@/core/types"
import { rangeOf, textOf, type Parsed, type Scopes } from "./estree"
import { childAt, textAt, type Node } from "./node"

export interface CallSite {
  at: Range
  receiver: string | null
}

interface CalleeName { name: string, node: Node, receiver: string | null, resolved: Node | null }

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (within: Range, pos: Pos): boolean =>
  atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

export const calleeOf = (node: Node): Node | null => {
  if (node.type === "CallExpression") return childAt(node, "callee")
  return node.type === "TaggedTemplateExpression" ? childAt(node, "tag") : null
}

const meansModuleBinding = (scopes: Scopes, node: Node): boolean => {
  const name = textAt(node, "name")
  const variable = name === null ? null : scopes.moduleVariable(name)
  return variable !== null && scopes.variableOf(node) === variable
}

function siteAt(parsed: Parsed, within: Range, node: Node, receiver: string | null): CallSite[] {
  const at = rangeOf(parsed, node)
  return contains(within, at.start) ? [{ at, receiver }] : []
}

function callSiteOf(parsed: Parsed, scopes: Scopes, within: Range, name: string, node: Node): CallSite[] {
  const callee = calleeOf(node)
  const site = callee === null ? null : calleeName(parsed, callee)
  if (site?.name !== name) return []
  return site.resolved === null || meansModuleBinding(scopes, site.resolved) ? siteAt(parsed, within, site.node, site.receiver) : []
}

function renderSiteOf(parsed: Parsed, scopes: Scopes, within: Range, name: string, node: Node): CallSite[] {
  const element = node.type === "JSXOpeningElement" ? childAt(node, "name") : null
  if (element?.type !== "JSXIdentifier" || element.name !== name) return []
  return meansModuleBinding(scopes, element) ? siteAt(parsed, within, element, null) : []
}

export function callSitesIn(parsed: Parsed, within: Range, name: string): CallSite[] {
  const scopes = parsed.scopes()
  return parsed.nodes.flatMap((node) => [
    ...callSiteOf(parsed, scopes, within, name, node),
    ...renderSiteOf(parsed, scopes, within, name, node),
  ])
}

function calleeName(parsed: Parsed, callee: Node): CalleeName | null {
  if (callee.type === "Identifier") return { name: textAt(callee, "name") ?? "", node: callee, receiver: null, resolved: callee }
  const property = childAt(callee, "property")
  const object = childAt(callee, "object")
  if (callee.type !== "MemberExpression" || callee.computed === true || property === null || object === null) return null
  const isNamed = object.type === "Identifier"
  return { name: textOf(parsed, property), node: property, receiver: isNamed ? textAt(object, "name") : null, resolved: isNamed ? object : null }
}
