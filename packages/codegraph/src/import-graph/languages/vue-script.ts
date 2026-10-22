import type { GrammarId } from "@/ast-graph/parser"

export interface VueScript {
  readonly grammar: GrammarId
  readonly text: string
  readonly source: string | null
  readonly isJavaScript: boolean
}

const SCRIPT_END_TAG_PATTERN = /<\/script(?=[\s/>])[^>]*>?/i
const SCRIPT_OPEN_TAG_START_PATTERN = /<script(?!\w)/i
const SCRIPT_OPEN_TAG_START = "<script"
const TAG_END = ">"
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

const toVueScript = (attributes: string, body: string): VueScript => ({
  grammar: grammarOf(attributes),
  text: body,
  source: SOURCE_ATTRIBUTE_PATTERN.exec(attributes)?.[1] ?? null,
  isJavaScript: isJavaScriptScript(attributes),
})

const scriptEndingIn = (textBeforeEndTag: string): VueScript[] => {
  const openTagStart = textBeforeEndTag.search(SCRIPT_OPEN_TAG_START_PATTERN)
  const attributesStart = openTagStart + SCRIPT_OPEN_TAG_START.length
  const openTagEnd = openTagStart === -1 ? -1 : textBeforeEndTag.indexOf(TAG_END, attributesStart)
  return openTagEnd === -1 ? [] : [toVueScript(textBeforeEndTag.slice(attributesStart, openTagEnd), textBeforeEndTag.slice(openTagEnd + TAG_END.length))]
}

export const readVueScripts = (text: string): VueScript[] => text.split(SCRIPT_END_TAG_PATTERN).slice(0, -1).flatMap(scriptEndingIn)
