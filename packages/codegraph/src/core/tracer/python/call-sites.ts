import type { Node, Tree } from "web-tree-sitter"
import type { Pos, Range } from "@/core/types"

export interface CallSite {
  at: Range
  receiver: string | null
}

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (within: Range, pos: Pos): boolean => atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

export function callSitesIn(tree: Tree, within: Range, name: string): CallSite[] {
  const siteOf = (node: Node): CallSite[] => {
    const callee = node.type === "call" ? node.childForFieldName("function") : null
    const site = callee === null ? null : calleeName(callee)
    if (site?.name !== name) return []
    const at = rangeOf(site.node)
    return contains(within, at.start) ? [{ at, receiver: site.receiver }] : []
  }
  const sitesIn = (node: Node): CallSite[] => [...siteOf(node), ...node.namedChildren.flatMap(sitesIn)]

  return sitesIn(tree.rootNode)
}

function calleeName(callee: Node): { name: string, node: Node, receiver: string | null } | null {
  if (callee.type === "identifier") return { name: callee.text, node: callee, receiver: null }
  if (callee.type === "attribute") {
    const property = callee.childForFieldName("attribute")
    if (property === null) return null
    const object = callee.childForFieldName("object")
    return { name: property.text, node: property, receiver: object?.text ?? null }
  }
  return null
}
