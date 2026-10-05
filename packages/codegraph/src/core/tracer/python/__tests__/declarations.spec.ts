import { describe, expect, it } from "vitest"
import { parseSource } from "@/core/tracer/parse"
import { declarationsIn, type LocalDecl } from "@/core/tracer/python/declarations"

async function decls(source: string): Promise<LocalDecl[]> {
  const tree = await parseSource("sample.py", source)
  if (tree === null) throw new Error("did not parse")
  return declarationsIn(tree)
}
const names = (list: LocalDecl[]): string[] => list.map((one) => one.name)

describe("declarationsIn (python)", () => {
  it("finds a function definition", async () => {
    const found = await decls("def price_of():\n    return 1\n")
    expect(names(found)).toStrictEqual(["price_of"])
    expect(found[0].definedAt.start.line).toBe(1)
  })

  it("names a class method Class.method", async () => {
    const found = await decls("class StockService:\n    def has_stock(self):\n        return True\n")
    expect(names(found)).toStrictEqual(["StockService.has_stock"])
  })

  it("unwraps a decorated function to the def", async () => {
    const found = await decls("@app.route('/x')\ndef view():\n    return 1\n")
    expect(names(found)).toStrictEqual(["view"])
  })

  it("finds a module-level lambda binding", async () => {
    const found = await decls("handler = lambda e: e\n")
    expect(names(found)).toStrictEqual(["handler"])
  })

  it("ignores a plain data binding", async () => {
    expect(names(await decls("total = 1 + 2\n"))).toStrictEqual([])
  })

  it("reports the name line for each of several defs", async () => {
    const found = await decls("def a():\n    return 1\n\ndef b():\n    return 2\n")
    expect(found.map((d) => [d.name, d.definedAt.start.line])).toStrictEqual([
      ["a", 1],
      ["b", 4],
    ])
  })
})
