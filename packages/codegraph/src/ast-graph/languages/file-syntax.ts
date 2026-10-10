import type { SyntaxTree } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"

const LINE_BREAK = "\n"

export const textOfTree = (tree: SyntaxTree): Pick<FileSyntax, "sourceLines"> => ({ sourceLines: tree.rootNode.text.split(LINE_BREAK) })
