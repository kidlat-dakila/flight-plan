import { describe, expect, it } from "vitest"
import type { Node } from "web-tree-sitter"
import { pythonParser } from "@/core/parsers/python"

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
    expect(labels).toStrictEqual(["then", "elif", "else"])
  })

  it("gives a for/while a single body arm", async () => {
    const t = await tree(["def f(xs):", "    for x in xs:", "        use(x)"].join("\n"))
    const loop = firstOfType(t.rootNode, "for_statement")
    expect(pythonParser.arms(loop).map((a) => a.label)).toStrictEqual(["body"])
  })

  it("splits a try into try/except/finally arms", async () => {
    const t = await tree(
      ["def f():", "    try:", "        a()", "    except Exception:", "        b()", "    finally:", "        c()"].join("\n"),
    )
    const tryS = firstOfType(t.rootNode, "try_statement")
    expect(pythonParser.arms(tryS).map((a) => a.label)).toStrictEqual(["try", "except", "finally"])
  })
})

function findOfType(node: Node, type: string): Node | null {
  return node.type === type ? node : node.namedChildren.reduce<Node | null>((found, child) => found ?? findOfType(child, type), null)
}

function firstOfType(node: Node, type: string): Node {
  const found = findOfType(node, type)
  if (found === null) throw new Error(`no ${type}`)
  return found
}
