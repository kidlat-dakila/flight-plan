import { describe, expect, it } from "vitest"
import { findIn, type SymbolSpan } from "@/core/symbols/spans"

const span = (name: string, from: number, to: number): SymbolSpan => ({
  name,
  from,
  to,
  nameAt: { line: from, column: 1 },
  kind: "callable",
})

const symbols: SymbolSpan[] = [
  span("hasStock", 10, 20),
  span("StockService", 30, 80),
  span("StockService.check", 35, 45),
  span("StockService.levelsFor", 50, 60),
  span("Warehouse", 90, 140),
  span("Warehouse.check", 95, 105),
]

describe("findIn", () => {
  it("should find a top-level declaration by name", () => {
    expect(findIn(symbols, "hasStock")).toStrictEqual({ from: 10, to: 20 })
  })

  it("should find a member by its short name when only one matches", () => {
    expect(findIn(symbols, "levelsFor")).toStrictEqual({ from: 50, to: 60 })
  })

  it("should find a member by its qualified name", () => {
    expect(findIn(symbols, "StockService.check")).toStrictEqual({ from: 35, to: 45 })
  })

  it("should refuse a short name two declarations answer to", () => {
    expect(findIn(symbols, "check")).toBe("ambiguous")
  })

  it("should prefer an exact match over a suffix one", () => {
    const both: SymbolSpan[] = [span("check", 1, 5), span("Thing.check", 10, 15)]
    expect(findIn(both, "check")).toStrictEqual({ from: 1, to: 5 })
  })

  it("should find nothing for a name that is not there", () => {
    expect(findIn(symbols, "missing")).toBeNull()
  })

  it("should not match a name that merely ends with the same letters", () => {
    expect(findIn(symbols, "Stock")).toBeNull()
  })
})
