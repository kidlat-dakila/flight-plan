import { isQuoted, textOfName, unquoted } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import type { RoutePattern } from "@/code-blocks/types"

const LEADING_SLASHES = /^\/+/
const TRAILING_SLASHES = /\/+$/
const PATH_TOKENS = /\{|\}|\(\.\*\)|\*\w*|:\w+\??|[^{}()*:]+|./g
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\/]/g
const SEGMENT = "[^/]+"
const OPTIONAL_SEGMENT = "[^/]*"
const ANYTHING = ".*"
const GROUP_START = "{"
const GROUP_END = "}"
const OPTIONAL_GROUP_START = "(?:"
const OPTIONAL_GROUP_END = ")?"
const LEGACY_WILDCARD = "(.*)"
const WILDCARD_MARK = "*"
const PARAM_MARK = ":"
const OPTIONAL_MARK = "?"
const TRAILING_SLASH = "/?"
const PAIR_TYPE = "pair"
const OBJECT_TYPE = "object"
const ARRAY_TYPE = "array"
const PATH_KEY = "path"
const METHOD_KEY = "method"
const MEMBER_SEPARATOR = "."
const EVERY_REQUEST_METHOD = "ALL"

export const EVERY_PATH_PATTERN = "^/.*$"

const escaped = (text: string): string => text.replace(REGEX_SPECIALS, "\\$&")

const sourceOfToken = (token: string): string => {
  if (token === GROUP_START) return OPTIONAL_GROUP_START
  if (token === GROUP_END) return OPTIONAL_GROUP_END
  if (token === LEGACY_WILDCARD || token.startsWith(WILDCARD_MARK)) return ANYTHING
  if (token.startsWith(PARAM_MARK) && token.length > PARAM_MARK.length) return token.endsWith(OPTIONAL_MARK) ? OPTIONAL_SEGMENT : SEGMENT
  return escaped(token)
}

const isValidPattern = (pattern: string): boolean => {
  try {
    return new RegExp(pattern) instanceof RegExp
  } catch {
    return false
  }
}

export const nestPathPatternOf = (path: string): string | null => {
  const written = path.replace(LEADING_SLASHES, "").replace(TRAILING_SLASHES, "")
  const body = (written.match(PATH_TOKENS) ?? []).map(sourceOfToken).join("")
  const pattern = `^/${body}${TRAILING_SLASH}$`
  return isValidPattern(pattern) ? pattern : null
}

const isPairNamed = (child: SyntaxNode, key: string): boolean => {
  const written = child.type === PAIR_TYPE ? child.childForFieldName("key") : null
  return written !== null && textOfName(written) === key
}

export const valueOfKey = (object: SyntaxNode | null, key: string): SyntaxNode | null =>
  object?.type === OBJECT_TYPE ? (object.namedChildren.find((child) => isPairNamed(child, key))?.childForFieldName("value") ?? null) : null

export const literalOf = (node: SyntaxNode | null): string | null => (node !== null && isQuoted(node) ? unquoted(node.text) : null)

const writtenPathOf = (route: SyntaxNode): string | null => (route.type === OBJECT_TYPE ? literalOf(valueOfKey(route, PATH_KEY)) : literalOf(route))

const listRoutes = (written: SyntaxNode): SyntaxNode[] => (written.type === ARRAY_TYPE ? written.namedChildren.flatMap(listRoutes) : [written])

const requestMethodOf = (route: SyntaxNode): string | null => {
  const written = route.type === OBJECT_TYPE ? valueOfKey(route, METHOD_KEY) : null
  const method = written === null ? null : written.text.split(MEMBER_SEPARATOR).slice(-1)[0].toUpperCase()
  return method === EVERY_REQUEST_METHOD ? null : method
}

export const readRoutePatterns = (written: readonly SyntaxNode[]): RoutePattern[] =>
  written.flatMap(listRoutes).flatMap((route) => {
    const path = writtenPathOf(route)
    const pathPattern = path === null ? null : nestPathPatternOf(path)
    return pathPattern === null ? [] : [{ pathPattern, method: requestMethodOf(route) }]
  })
