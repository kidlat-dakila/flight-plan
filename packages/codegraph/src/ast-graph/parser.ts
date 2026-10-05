import Parser from "tree-sitter"
import Python from "tree-sitter-python"
import TypeScript from "tree-sitter-typescript"
import { Memo } from "@/core/memo"

export type GrammarId = "typescript" | "tsx" | "python"

export type SyntaxTree = Parser.Tree
export type SyntaxNode = Parser.SyntaxNode
export type SyntaxCursor = Parser.TreeCursor
export type SyntaxPoint = Parser.Point
export type QueryCapture = Parser.QueryCapture

const GRAMMARS: Record<GrammarId, Parser.Language> = {
  typescript: TypeScript.typescript,
  tsx: TypeScript.tsx,
  python: Python,
}

const parsers = new Memo<GrammarId, Parser>()
const queries = new Memo<string, Parser.Query>()

const parserFor = (id: GrammarId): Parser =>
  parsers.remember(id, () => {
    const parser = new Parser()
    parser.setLanguage(GRAMMARS[id])
    return parser
  })

const queryFor = (id: GrammarId, pattern: string): Parser.Query =>
  queries.remember(`${id}\n${pattern}`, () => new Parser.Query(GRAMMARS[id], pattern))

export const parseWithGrammar = (id: GrammarId, text: string): SyntaxTree => parserFor(id).parse(text)

export const queryCaptures = (id: GrammarId, node: SyntaxNode, pattern: string): QueryCapture[] =>
  queryFor(id, pattern).captures(node)
