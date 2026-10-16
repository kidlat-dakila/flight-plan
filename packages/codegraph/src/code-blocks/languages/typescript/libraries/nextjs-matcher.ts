import { isQuoted, textOfName, unquoted } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"

interface TextToken {
  readonly kind: "text"
  readonly text: string
}

interface ParamToken {
  readonly kind: "param"
  readonly prefix: string
  readonly pattern: string
  readonly modifier: string
}

type MatcherToken = TextToken | ParamToken

const PARAM_NAME_PATTERN = /^:\w+/
const DEFAULT_SEGMENT_PATTERN = "[^/#?]+?"
const MODIFIERS: ReadonlySet<string> = new Set(["*", "+", "?"])
const PREFIXES: ReadonlySet<string> = new Set(["/", "."])
const ESCAPE_MARK = "\\"
const ESCAPED_LENGTH = 2
const GROUP_START = "("
const GROUP_END = ")"
const UNSUPPORTED_MARKS: ReadonlySet<string> = new Set(["{", "}"])
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\/]/g
const TRAILING_SLASH = "(?:/)?"
const NO_MODIFIER = ""
const NO_PREFIX = ""
const DECLARATOR_TYPE = "variable_declarator"
const PAIR_TYPE = "pair"
const ARRAY_TYPE = "array"
const OBJECT_TYPE = "object"
const MATCHER_KEY = "matcher"
const SOURCE_KEY = "source"

export const EVERY_PATH_PATTERN = "^/.*$"

const closingOf = (source: string, index: number, depth: number): number | null => {
  if (index >= source.length) return null
  const char = source[index]
  if (char === ESCAPE_MARK) return closingOf(source, index + ESCAPED_LENGTH, depth)
  if (char === GROUP_START) return closingOf(source, index + 1, depth + 1)
  if (char === GROUP_END) return depth === 1 ? index : closingOf(source, index + 1, depth - 1)
  return closingOf(source, index + 1, depth)
}

const modifierAt = (source: string, index: number): string => (MODIFIERS.has(source[index] ?? "") ? source[index] : NO_MODIFIER)

const paramFrom = (source: string, index: number, pattern: string): readonly [ParamToken, number] => {
  const modifier = modifierAt(source, index)
  return [{ kind: "param", prefix: NO_PREFIX, pattern, modifier }, index + modifier.length]
}

const groupAt = (source: string, index: number): readonly [string, number] | null => {
  if (source[index] !== GROUP_START) return null
  const end = closingOf(source, index, 0)
  return end === null ? null : [source.slice(index + 1, end), end + 1]
}

const tokenAt = (source: string, index: number): readonly [MatcherToken, number] | null => {
  const char = source[index]
  if (UNSUPPORTED_MARKS.has(char)) return null
  if (char === ESCAPE_MARK) return [{ kind: "text", text: source[index + 1] ?? "" }, index + ESCAPED_LENGTH]
  const name = PARAM_NAME_PATTERN.exec(source.slice(index))?.[0]
  if (name !== undefined) {
    const afterName = index + name.length
    const group = groupAt(source, afterName)
    return group === null ? paramFrom(source, afterName, DEFAULT_SEGMENT_PATTERN) : paramFrom(source, group[1], group[0])
  }
  if (char === GROUP_START) {
    const group = groupAt(source, index)
    return group === null ? null : paramFrom(source, group[1], group[0])
  }
  return [{ kind: "text", text: char }, index + 1]
}

const tokensFrom = (source: string, index: number): MatcherToken[] | null => {
  if (index >= source.length) return []
  const token = tokenAt(source, index)
  if (token === null) return null
  const rest = tokensFrom(source, token[1])
  return rest === null ? null : [token[0], ...rest]
}

const isPrefixText = (token: MatcherToken | undefined): token is TextToken => token?.kind === "text" && PREFIXES.has(token.text)

const withPrefixes = (tokens: readonly MatcherToken[]): MatcherToken[] =>
  tokens.flatMap((token, index) => {
    if (isPrefixText(token) && tokens[index + 1]?.kind === "param") return []
    const previous = tokens[index - 1]
    return token.kind === "param" && isPrefixText(previous) ? [{ ...token, prefix: previous.text }] : [token]
  })

const escaped = (text: string): string => text.replace(REGEX_SPECIALS, "\\$&")

const sourceOfParam = ({ prefix, pattern, modifier }: ParamToken): string => {
  const one = `${escaped(prefix)}(?:${pattern})`
  if (modifier === "?") return `(?:${one})?`
  if (modifier === "*" || modifier === "+") return `(?:${one}(?:${one})*)${modifier === "*" ? "?" : ""}`
  return one
}

const sourceOfToken = (token: MatcherToken): string => (token.kind === "text" ? escaped(token.text) : sourceOfParam(token))

const isValidPattern = (pattern: string): boolean => {
  try {
    return new RegExp(pattern) instanceof RegExp
  } catch {
    return false
  }
}

export const pathPatternOf = (matcher: string): string | null => {
  const tokens = tokensFrom(matcher, 0)
  if (tokens === null) return null
  const pattern = `^${withPrefixes(tokens).map(sourceOfToken).join("")}${TRAILING_SLASH}$`
  return isValidPattern(pattern) ? pattern : null
}

const isPairNamed = (child: SyntaxNode, key: string): boolean => {
  const written = child.type === PAIR_TYPE ? child.childForFieldName("key") : null
  return written !== null && textOfName(written) === key
}

const pairNamed = (object: SyntaxNode, key: string): SyntaxNode | null =>
  object.namedChildren.find((child) => isPairNamed(child, key))?.childForFieldName("value") ?? null

const literalOf = (node: SyntaxNode | null): string | null => (node !== null && isQuoted(node) ? unquoted(node.text) : null)

const writtenMatcherOf = (entry: SyntaxNode): string | null => (entry.type === OBJECT_TYPE ? literalOf(pairNamed(entry, SOURCE_KEY)) : literalOf(entry))

const listWrittenMatchers = (matcher: SyntaxNode): (string | null)[] =>
  matcher.type === ARRAY_TYPE ? matcher.namedChildren.map(writtenMatcherOf) : [writtenMatcherOf(matcher)]

const declaratorAround = (node: SyntaxNode | null): SyntaxNode | null =>
  node === null || node.type === DECLARATOR_TYPE ? node : declaratorAround(node.parent)

export const readMatcherPatterns = (config: SyntaxNode | null): string[] => {
  const value = declaratorAround(config)?.childForFieldName("value") ?? null
  const matcher = value?.type === OBJECT_TYPE ? pairNamed(value, MATCHER_KEY) : null
  if (matcher === null) return [EVERY_PATH_PATTERN]
  const patterns = listWrittenMatchers(matcher).map((written) => (written === null ? null : pathPatternOf(written)))
  return patterns.length === 0 || patterns.some((pattern) => pattern === null) ? [EVERY_PATH_PATTERN] : patterns.filter((pattern) => pattern !== null)
}
