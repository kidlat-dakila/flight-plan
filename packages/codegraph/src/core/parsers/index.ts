import type { Range, StepType } from "@/core/types"
import { pythonParser } from "./python"
import { typescriptParser } from "./typescript"

export interface Statement {
  type: StepType
  lines: [number, number]
  text: string
  range: Range
  arms: Arm[]
}

export interface Arm { label: string, statements: Statement[] }

export interface LanguageParser {
  id: string
  extensions: string[]
  statements: (body: string) => Promise<Statement[] | null>

  isFunctionSource: (text: string) => boolean
  isCall: (afterReference: string) => boolean
}

const PARSERS: LanguageParser[] = [typescriptParser, pythonParser]

export function parserForPath(filePath: string): LanguageParser | null {
  const dot = filePath.lastIndexOf(".")
  const ext = dot === -1 ? "" : filePath.slice(dot).toLowerCase()
  return PARSERS.find((parser) => parser.extensions.includes(ext)) ?? null
}
