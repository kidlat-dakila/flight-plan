import { selectFiles } from "@/procedures/search-files/utils/select-files"

const CHANGED_PATHS = ["src/stock/stock-level.ts", "src/stock/holds.ts"]
const UNCHANGED_PATHS = ["src/cart/holds-banner.tsx", "src/stock/index.ts", "README.md"]

const select = (query: string, limit = 50) =>
  selectFiles({ changedPaths: CHANGED_PATHS, unchangedPaths: UNCHANGED_PATHS, query, limit })

describe("selectFiles", () => {
  it("offers every changed file, and nothing else, before anything is typed", () => {
    expect(select("  ")).toStrictEqual({
      options: [
        { path: "src/stock/stock-level.ts", stateLabel: "Changed" },
        { path: "src/stock/holds.ts", stateLabel: "Changed" },
      ],
      message: null,
    })
  })

  it("puts the changed files that match before the unchanged files that match", () => {
    expect(select("holds").options).toStrictEqual([
      { path: "src/stock/holds.ts", stateLabel: "Changed" },
      { path: "src/cart/holds-banner.tsx", stateLabel: null },
    ])
  })

  it("keeps the best matches when there are more than the limit", () => {
    expect(select("s", 2).options.map((option) => option.path)).toStrictEqual([
      "src/stock/stock-level.ts",
      "src/stock/holds.ts",
    ])
  })

  it("says so when nothing matches, and when there is no changed file to offer", () => {
    expect(select("zzz")).toStrictEqual({ options: [], message: "No file matches." })
    expect(selectFiles({ changedPaths: [], unchangedPaths: UNCHANGED_PATHS, query: "", limit: 50 })).toStrictEqual({
      options: [],
      message: "This Flight Plan has no changed files.",
    })
  })
})
