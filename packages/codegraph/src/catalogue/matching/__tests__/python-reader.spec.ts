import type { SyntaxNode } from "@/ast-graph/parser"
import { readPython } from "@/catalogue/matching/python-reader"
import type { Binding } from "@/catalogue/matching/syntax-reader"

const CALL_TYPE = "call"

const lines = (...written: readonly string[]): string => written.join("\n")

const calleeNamed = (node: SyntaxNode, name: string): SyntaxNode | null => {
  const callee = node.type === CALL_TYPE ? node.childForFieldName("function") : null
  if (callee?.text === name) return callee
  return node.namedChildren.map((child) => calleeNamed(child, name)).find((found) => found !== null) ?? null
}

const bindingOfCallee = (source: string, name: string): Binding | null => {
  const reader = readPython(source)
  const callee = calleeNamed(reader.tree.rootNode, name)
  return callee === null ? null : reader.bindingOf(callee)
}

describe("a name the file never binds", () => {
  it("comes from builtins", () => {
    expect(bindingOfCallee(lines("with open(\"report.csv\") as report:", "    rows = report.readlines()"), "open")).toStrictEqual({
      kind: "import",
      specifier: "builtins",
      importedName: "open",
    })
  })

  it("does not come from builtins when a def binds it", () => {
    expect(bindingOfCallee(lines("def open(path):", "    return path", "", "open(\"report.csv\")"), "open")).toBeNull()
  })

  it("comes from the parameter that binds it, not from builtins", () => {
    expect(bindingOfCallee(lines("def read_report(path, open):", "    return open(path)"), "open")).toMatchObject({ kind: "parameter", position: 1 })
  })

  it("does not come from builtins when a loop binds it", () => {
    expect(bindingOfCallee(lines("for open in openers:", "    open(\"report.csv\")"), "open")).toBeNull()
  })

  it("keeps the import that binds it", () => {
    expect(bindingOfCallee(lines("from storage import open", "", "open(\"report.csv\")"), "open")).toStrictEqual({
      kind: "import",
      specifier: "storage",
      importedName: "open",
    })
  })
})
