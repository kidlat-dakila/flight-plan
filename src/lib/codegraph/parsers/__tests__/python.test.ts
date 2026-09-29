import { describe, expect, it } from "vitest"
import { pythonParser } from "../python"

async function tree(src: string) {
  const t = await pythonParser.parse(src)
  if (t === null) throw new Error("did not parse")
  return t
}

describe("pythonParser.stepType", () => {
  it("maps python node types to the generic vocabulary", () => {
    expect(pythonParser.stepType("if_statement")).toBe("conditional")
    expect(pythonParser.stepType("for_statement")).toBe("loop")
    expect(pythonParser.stepType("while_statement")).toBe("loop")
    expect(pythonParser.stepType("try_statement")).toBe("try")
    expect(pythonParser.stepType("return_statement")).toBe("return")
    expect(pythonParser.stepType("raise_statement")).toBe("throw")
    expect(pythonParser.stepType("break_statement")).toBe("jump")
    expect(pythonParser.stepType("continue_statement")).toBe("jump")
    expect(pythonParser.stepType("expression_statement")).toBe("expression")
    expect(pythonParser.stepType("function_definition")).toBe("declaration")
    expect(pythonParser.stepType("with_statement")).toBe("block")
    expect(pythonParser.stepType("comment")).toBe("comment")
    expect(pythonParser.stepType("nonsense")).toBe("other")
  })
})

describe("pythonParser.functionBody", () => {
  it("finds the block suite of the first function", async () => {
    const body = pythonParser.functionBody(await tree("def f():\n    return 1\n"))
    expect(body?.type).toBe("block")
  })
})

describe("pythonParser.arms", () => {
  it("splits an if/elif/else into arms", async () => {
    const t = await tree(
      ["def f(x):", "    if x:", "        a()", "    elif x == 2:", "        b()", "    else:", "        c()"].join("\n"),
    )
    const iff = firstOfType(t.rootNode, "if_statement")
    const labels = pythonParser.arms(iff).map((a) => a.label)
    expect(labels).toEqual(["then", "elif", "else"])
  })

  it("gives a for/while a single body arm", async () => {
    const t = await tree(["def f(xs):", "    for x in xs:", "        use(x)"].join("\n"))
    const loop = firstOfType(t.rootNode, "for_statement")
    expect(pythonParser.arms(loop).map((a) => a.label)).toEqual(["body"])
  })

  it("splits a try into try/except/finally arms", async () => {
    const t = await tree(
      ["def f():", "    try:", "        a()", "    except Exception:", "        b()", "    finally:", "        c()"].join("\n"),
    )
    const tryS = firstOfType(t.rootNode, "try_statement")
    expect(pythonParser.arms(tryS).map((a) => a.label)).toEqual(["try", "except", "finally"])
  })
})

// helper: first descendant of a node type (pre-order)
function firstOfType(node: import("web-tree-sitter").Node, type: string): import("web-tree-sitter").Node {
  if (node.type === type) return node
  for (const child of node.namedChildren) {
    if (child === null) continue
    try {
      return firstOfType(child, type)
    } catch {
      /* keep searching */
    }
  }
  throw new Error(`no ${type}`)
}
