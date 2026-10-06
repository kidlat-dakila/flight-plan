import { parseWithGrammar, type GrammarId } from "@/ast-graph/parser"
import { hasExtension } from "@/import-graph/languages/language"
import type { ASTGraphFileInput, BaseASTGraphFile } from "./base"
import { JSXASTGraphFile } from "./jsx"
import { PythonASTGraphFile } from "./python"
import { TypescriptASTGraphFile } from "./typescript"
import { VueASTGraphFile } from "./vue"

export interface ASTGraphSource extends Omit<ASTGraphFileInput, "tree"> {
  readonly source: string
}

interface ASTGraphLanguage {
  readonly extensions: readonly string[]
  readonly grammar: GrammarId
  readonly create: (input: ASTGraphFileInput) => BaseASTGraphFile
}

const AST_GRAPH_LANGUAGES: readonly ASTGraphLanguage[] = [
  { extensions: [".ts", ".mts", ".cts"], grammar: "typescript", create: (input) => new TypescriptASTGraphFile(input) },
  { extensions: [".tsx", ".jsx", ".js", ".mjs", ".cjs"], grammar: "tsx", create: (input) => new JSXASTGraphFile(input) },
  { extensions: [".py", ".pyi"], grammar: "python", create: (input) => new PythonASTGraphFile(input) },
  { extensions: [".vue"], grammar: "html", create: (input) => new VueASTGraphFile(input) },
]

export const createASTGraphFile = ({ source, ...input }: ASTGraphSource): BaseASTGraphFile | null => {
  const language = AST_GRAPH_LANGUAGES.find(({ extensions }) => hasExtension(input.filePath, extensions))
  if (language === undefined) return null
  return language.create({ ...input, tree: parseWithGrammar(language.grammar, source) })
}
