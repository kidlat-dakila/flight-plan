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

export type CodeHighlighter = (lines: readonly string[], language: string) => Promise<readonly TokenLine[]>

export const highlightAsPlainText: CodeHighlighter = async (lines) =>
  await Promise.resolve(lines.map((text) => (text === "" ? [] : [{ text, kind: "plain" as const }])))
