import { describe, expect, it } from "vitest"
import { fileSymbols, symbolLanguageOf } from "@/core/symbols/declarations"
import { type SymbolSpan, findIn } from "@/core/symbols/spans"

async function declarations(source: string, file = "checkout/pricing.py"): Promise<SymbolSpan[]> {
  const all = await fileSymbols(file, source)
  if (all === null) throw new Error(`nothing parsed ${file}`)
  return all
}

const named = (all: SymbolSpan[], name: string): SymbolSpan | undefined => all.find((one) => one.name === name)

const SOURCE = [
  "TAX_RATE = 0.2",
  "",
  "def price_of(ids):",
  "    unique = set(ids)",
  "    return len(unique)",
  "",
  "@dataclass",
  "class Basket:",
  "    limit = 10",
  "",
  "    @property",
  "    def total(self):",
  "        return 0",
  "",
  "    class Line:",
  "        def cost(self):",
  "            return 1",
  "",
  "label_for = lambda x: x.strip()",
].join("\n")

describe("what a Python file declares", () => {
  it("reads .py and .pyi", () => {
    expect(symbolLanguageOf("a.py")).toBe("python")
    expect(symbolLanguageOf("a.pyi")).toBe("python")
  })

  it("reports a function with its whole range and its name's position", async () => {
    expect(named(await declarations(SOURCE), "price_of")).toStrictEqual({
      name: "price_of",
      from: 3,
      to: 5,
      nameAt: { line: 3, column: 5 },
      kind: "callable",
    })
  })

  it("walks classes, never function bodies", async () => {
    const all = await declarations(SOURCE)
    expect(all.map((one) => [one.name, one.kind])).toStrictEqual([
      ["TAX_RATE", "other"],
      ["price_of", "callable"],
      ["Basket", "container"],
      ["Basket.limit", "other"],
      ["Basket.total", "callable"],
      ["Basket.Line", "container"],
      ["Basket.Line.cost", "callable"],
      ["label_for", "callable"],
    ])
    expect(named(all, "unique")).toBeUndefined()
  })

  it("starts a decorated definition on its decorator, and names it by the definition", async () => {
    const all = await declarations(SOURCE)
    expect(named(all, "Basket")).toMatchObject({ from: 7, to: 17, nameAt: { line: 8, column: 7 } })
    expect(named(all, "Basket.total")).toMatchObject({ from: 11, to: 13 })
  })

  it("resolves a short name when it is unambiguous", async () => {
    const all = await declarations(SOURCE)
    expect(findIn(all, "cost")).toStrictEqual({ from: 16, to: 17 })
  })
})
