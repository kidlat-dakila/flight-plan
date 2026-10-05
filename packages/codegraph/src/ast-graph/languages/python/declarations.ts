import type { SyntaxTree } from "@/ast-graph/parser"
import type { FileVariable } from "@/ast-graph/types"
import { readBindings } from "./bindings"

export const readFileVariables = (tree: SyntaxTree): readonly FileVariable[] => readBindings(tree).variables
