import { describe, expect, it } from "vitest"
import { languageOf, parseSource } from "@/core/tracer/parse"

describe("python grammar loads", () => {
  it("maps .py to the python language id", () => {
    expect(languageOf("app/main.py")).toBe("python")
    expect(languageOf("app/main.pyi")).toBe("python")
  })

  it("parses a python function without an error root", async () => {
    const tree = await parseSource("m.py", "def f(x):\n    return x + 1\n")
    expect(tree).not.toBeNull()
    expect(tree?.rootNode.type).toBe("module")
    const fn = tree?.rootNode.namedChildren.find((n) => n.type === "function_definition")
    expect(fn?.childForFieldName("name")?.text).toBe("f")
  })
})
