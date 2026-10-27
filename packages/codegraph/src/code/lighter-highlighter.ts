import { highlight, UnknownLanguageError } from "@code-hike/lighter"
import { lastOf } from "@/walkthrough/last-of"
import type { CodeToken, TokenLine } from "@flightplan/configurations"
import { highlightAsPlainText, type CodeHighlighter } from "./highlighter"
import { tokenKindOf } from "./token-kind"

const SCOPE_THEME = "github-dark"
const MAX_CACHED_FILES = 200

interface ScopedToken {
  readonly content: string
  readonly scopes?: readonly string[]
}

const withToken = (tokens: readonly CodeToken[], token: CodeToken): CodeToken[] => {
  const last = lastOf(tokens)
  return last?.kind === token.kind
    ? [...tokens.slice(0, -1), { kind: token.kind, text: `${last.text}${token.text}` }]
    : [...tokens, token]
}

export const mergeTokens = (tokens: readonly ScopedToken[]): TokenLine =>
  tokens
    .map((token): CodeToken => ({ text: token.content, kind: tokenKindOf(token.scopes ?? []) }))
    .reduce<CodeToken[]>(withToken, [])

const highlightLines = async (lines: readonly string[], language: string): Promise<readonly TokenLine[]> => {
  try {
    const highlighted = await highlight(lines.join("\n"), language, SCOPE_THEME, { scopes: true })
    return lines.map((_line, index) => mergeTokens(highlighted.lines[index] ?? []))
  } catch (error) {
    if (error instanceof UnknownLanguageError) return await highlightAsPlainText(lines, language)
    throw error
  }
}

class HighlightCache {
  private entries: ReadonlyMap<string, Promise<readonly TokenLine[]>> = new Map()

  public readonly highlight: CodeHighlighter = async (lines, language) => {
    const key = [language, ...lines].join("\n")
    const cached = this.entries.get(key)
    if (cached !== undefined) return await cached
    const pending = highlightLines(lines, language)
    this.entries = new Map([...[...this.entries].slice(1 - MAX_CACHED_FILES), [key, pending]])
    return await pending
  }
}

export const createCodeHighlighter = (): CodeHighlighter => new HighlightCache().highlight
