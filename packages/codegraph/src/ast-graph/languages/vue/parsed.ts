import { parseWithGrammar, type GrammarId, type SyntaxTree } from "@/ast-graph/parser"
import { parseScripts, type ParsedScript } from "./script"
import { readSfc, type Sfc } from "./sfc"
import { parseTemplate, type ParsedTemplate } from "./template"

export interface ParsedVue {
  readonly tree: SyntaxTree
  readonly sfc: Sfc
  readonly scripts: readonly ParsedScript[]
  readonly template: ParsedTemplate | null
}

const GRAMMAR: GrammarId = "html"

export const parseVue = (source: string): ParsedVue => {
  const tree = parseWithGrammar(GRAMMAR, source)
  const sfc = readSfc(tree)
  return { tree, sfc, scripts: parseScripts(sfc, source), template: parseTemplate(sfc.template, source) }
}
