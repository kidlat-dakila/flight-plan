import { fileNameOf, fuzzyScoreOf } from "@/procedures/search-files/utils/fuzzy-score"

describe("fuzzyScoreOf", () => {
  it("matches the letters of the query in order, wherever they are in the path", () => {
    expect(fuzzyScoreOf("stlv", "src/stock/stock-level.ts")).not.toBeNull()
    expect(fuzzyScoreOf("STOCK level", "src/stock/stock-level.ts")).not.toBeNull()
    expect(fuzzyScoreOf("levelstock", "src/stock/stock-level.ts")).toBeNull()
  })

  it("scores a match in the file name above the same match in a folder", () => {
    const inFileName = fuzzyScoreOf("holds", "src/stock/holds.ts") ?? 0
    const inFolder = fuzzyScoreOf("holds", "src/holds/index.ts") ?? 0

    expect(inFileName).toBeGreaterThan(inFolder)
  })

  it("scores letters that follow each other and start a word above scattered ones", () => {
    const together = fuzzyScoreOf("badge", "src/ui/StockBadge.tsx") ?? 0
    const scattered = fuzzyScoreOf("badge", "src/ui/base-dialog-edges.tsx") ?? 0

    expect(together).toBeGreaterThan(scattered)
  })

  it("names a file by the last part of its path", () => {
    expect(fileNameOf("src/stock/holds.ts")).toBe("holds.ts")
    expect(fileNameOf("README.md")).toBe("README.md")
  })
})
