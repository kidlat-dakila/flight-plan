export const TOKEN_KINDS = [
  "plain",
  "keyword",
  "string",
  "number",
  "comment",
  "function",
  "type",
  "property",
  "constant",
  "tag",
  "punctuation",
] as const

export type TokenKind = (typeof TOKEN_KINDS)[number]

export interface CodeToken {
  readonly text: string
  readonly kind: TokenKind
}

export type TokenLine = readonly CodeToken[]
