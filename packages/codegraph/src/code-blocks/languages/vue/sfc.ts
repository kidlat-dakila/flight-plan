import { parseVue, type ParsedVue } from "@/ast-graph/languages/vue/parsed"
import type { ScriptBlock, Sfc } from "@/ast-graph/languages/vue/sfc"
import type { SyntaxNode } from "@/ast-graph/parser"
import { comparePositions, rangeOfNode } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"

export interface SingleFile {
  readonly source: string
  readonly parsed: ParsedVue
  readonly setup: ScriptBlock | null
  readonly script: ScriptBlock | null
  readonly template: SyntaxNode | null
  readonly componentRange: SourceRange | null
}

const EXTENSION_PATTERN = /\.[^./]+$/
const FOLDER_SEPARATOR = "/"

const spanOf = (parts: readonly SyntaxNode[]): SourceRange | null => {
  const ranges = parts.map(rangeOfNode)
  if (ranges.length === 0) return null
  return {
    start: ranges.map((range) => range.start).reduce((first, start) => (comparePositions(start, first) < 0 ? start : first)),
    end: ranges.map((range) => range.end).reduce((last, end) => (comparePositions(end, last) > 0 ? end : last)),
  }
}

const componentRangeOf = ({ scripts, template }: Sfc): SourceRange | null => {
  const setup = scripts.find((script) => script.isSetup)
  return spanOf([...(setup === undefined ? [] : [setup.element]), ...(template === null ? [] : [template])])
}

export const readSingleFile = (source: string): SingleFile => {
  const parsed = parseVue(source)
  const { sfc } = parsed
  return {
    source,
    parsed,
    setup: sfc.scripts.find((script) => script.isSetup) ?? null,
    script: sfc.scripts.find((script) => !script.isSetup) ?? null,
    template: sfc.template,
    componentRange: componentRangeOf(sfc),
  }
}

export const componentNameOf = (filePath: string): string => {
  const fileName = filePath.split(FOLDER_SEPARATOR).slice(-1)[0]
  return fileName.replace(EXTENSION_PATTERN, "")
}
