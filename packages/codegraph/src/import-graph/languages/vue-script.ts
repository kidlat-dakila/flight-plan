import type { LanguageId } from "@/core/tracer/parse"

export interface VueScript {
  readonly grammar: LanguageId
  readonly text: string
  readonly source: string | null
}

const SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
const LANGUAGE_ATTRIBUTE_PATTERN = /\blang\s*=\s*["']?([A-Za-z]+)/i
const SOURCE_ATTRIBUTE_PATTERN = /\bsrc\s*=\s*["']([^"']+)["']/i
const TYPESCRIPT_SCRIPT_LANGUAGE = "ts"

const grammarOf = (attributes: string): LanguageId =>
  LANGUAGE_ATTRIBUTE_PATTERN.exec(attributes)?.[1]?.toLowerCase() === TYPESCRIPT_SCRIPT_LANGUAGE ? "typescript" : "tsx"

export const readVueScripts = (text: string): VueScript[] =>
  [...text.matchAll(SCRIPT_PATTERN)].map(([, attributes = "", body = ""]) => ({
    grammar: grammarOf(attributes),
    text: body,
    source: SOURCE_ATTRIBUTE_PATTERN.exec(attributes)?.[1] ?? null,
  }))
