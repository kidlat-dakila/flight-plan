/**
 * The language-parser boundary.
 *
 * A {@link LanguageParser} holds everything language-specific the execution
 * steps need: how to read a function body into {@link Statement}s, and the
 * call and function syntax. The step builder takes the statements and never
 * names a syntax node itself, so a new language is a new file here and nothing
 * else changes.
 */
import type { Range, StepType } from "../types"
import { pythonParser } from "./python"
import { typescriptParser } from "./typescript"

/** One statement of a function body, as the step builder reads it. */
export type Statement = {
  type: StepType
  /** The first and last line it spans, 1-based, relative to the body. */
  lines: [number, number]
  /** Its source text. */
  text: string
  /** Its full range, relative to the body (1-based line, 0-based column). */
  range: Range
  /** The arms of a branching statement; empty for a straight-line one. */
  arms: Arm[]
}

/** One arm of a branching statement: a label and the statements it holds, comments included. */
export type Arm = { label: string; statements: Statement[] }

export type LanguageParser = {
  /** A stable id, e.g. `"typescript"`. */
  id: string
  /** File extensions this parser handles, lowercase with the dot. */
  extensions: string[]
  /**
   * The statements of a function body's source, comments included (as
   * `"comment"` steps, which the builder drops), or null when nothing can
   * read it.
   */
  statements(body: string): Promise<Statement[] | null>

  // --- source heuristics ---
  /** Whether a definition's source reads as a function (e.g. `=>` / `function`). */
  isFunctionSource(text: string): boolean
  /** Whether the text right after a reference makes it a call (e.g. a `(`). */
  isCall(afterReference: string): boolean
}

const PARSERS: LanguageParser[] = [typescriptParser, pythonParser]

/** The parser for a file, chosen by its extension, or null when none handles it. */
export function parserForPath(filePath: string): LanguageParser | null {
  const dot = filePath.lastIndexOf(".")
  const ext = dot === -1 ? "" : filePath.slice(dot).toLowerCase()
  return PARSERS.find((parser) => parser.extensions.includes(ext)) ?? null
}
