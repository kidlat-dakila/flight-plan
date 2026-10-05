import type { TokenKind } from "@flightplan/configurations"

const KIND_BY_SCOPE_PREFIX: readonly (readonly [string, TokenKind])[] = [
  ["comment", "comment"],
  ["punctuation.definition.comment", "comment"],
  ["string", "string"],
  ["punctuation.definition.string", "string"],
  ["constant.numeric", "number"],
  ["constant", "constant"],
  ["variable.other.constant", "constant"],
  ["support.constant", "constant"],
  ["keyword.operator", "punctuation"],
  ["keyword", "keyword"],
  ["storage", "keyword"],
  ["support.class.component", "tag"],
  ["entity.name.tag", "tag"],
  ["entity.name.function", "function"],
  ["support.function", "function"],
  ["entity.name.type", "type"],
  ["entity.name.class", "type"],
  ["support.type", "type"],
  ["support.class", "type"],
  ["entity.other.attribute-name", "property"],
  ["variable.other.property", "property"],
  ["variable.other.object.property", "property"],
  ["meta.object-literal.key", "property"],
  ["punctuation", "punctuation"],
  ["meta.brace", "punctuation"],
]

export const tokenKindOf = (scopes: readonly string[]): TokenKind => {
  const [innermostScope = ""] = scopes
  return KIND_BY_SCOPE_PREFIX.find(([prefix]) => innermostScope.startsWith(prefix))?.[1] ?? "plain"
}
