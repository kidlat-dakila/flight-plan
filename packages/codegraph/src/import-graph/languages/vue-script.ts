import type { GrammarId } from "@/ast-graph/parser"

export interface VueScript {
  readonly grammar: GrammarId
  readonly text: string
  readonly source: string | null
  readonly isJavaScript: boolean
}

const SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
const LANGUAGE_ATTRIBUTE_PATTERN = /\blang\s*=\s*["']?([A-Za-z]+)/i
const SOURCE_ATTRIBUTE_PATTERN = /\bsrc\s*=\s*["']([^"']+)["']/i
const TYPESCRIPT_SCRIPT_LANGUAGE = "ts"
const JAVASCRIPT_SCRIPT_LANGUAGES: ReadonlySet<string> = new Set(["js", "jsx"])

const languageOf = (attributes: string): string | null => LANGUAGE_ATTRIBUTE_PATTERN.exec(attributes)?.[1]?.toLowerCase() ?? null

const isJavaScriptScript = (attributes: string): boolean => {
  const language = languageOf(attributes)
  return language === null || JAVASCRIPT_SCRIPT_LANGUAGES.has(language)
}

const grammarOf = (attributes: string): GrammarId => (languageOf(attributes) === TYPESCRIPT_SCRIPT_LANGUAGE ? "typescript" : "tsx")

export const readVueScripts = (text: string): VueScript[] =>
  [...text.matchAll(SCRIPT_PATTERN)].map(([, attributes = "", body = ""]) => ({
    grammar: grammarOf(attributes),
    text: body,
    source: SOURCE_ATTRIBUTE_PATTERN.exec(attributes)?.[1] ?? null,
    isJavaScript: isJavaScriptScript(attributes),
  }))
