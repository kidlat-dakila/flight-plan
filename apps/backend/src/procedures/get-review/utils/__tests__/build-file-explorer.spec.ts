import { buildFileExplorer, type FileExplorerSource } from "@/procedures/get-review/utils/build-file-explorer"
import type { FileExplorerRow } from "@/procedures/get-review/utils/schemas"
import type { WalkthroughFileSummary } from "@flightplan/codegraph"

const summaryOf = (path: string, overrides: Partial<WalkthroughFileSummary> = {}): WalkthroughFileSummary => ({
  path,
  markKinds: [],
  waypointCount: 2,
  reviewedCount: 0,
  matchCount: 2,
  isShown: true,
  ...overrides,
})

const CHANGED_PATHS = [
  "tests/test_pokemon.py",
  "src/pokedex/main.py",
  "src/pokedex/pokemon/service.py",
  "src/pokedex/pokemon/models.py",
  "src/pokedex/pokemon/schemas.py",
  "pyproject.toml",
]

const COVERED_PATHS = CHANGED_PATHS.filter((path) => path !== "pyproject.toml")

const sourceOf = (overrides: Partial<FileExplorerSource> = {}): FileExplorerSource => ({
  changedPaths: CHANGED_PATHS,
  diffTypes: new Map([["src/pokedex/main.py", "modified"], ["src/pokedex/pokemon/models.py", "added"]]),
  summaries: COVERED_PATHS.map((path) => summaryOf(path)),
  anchorIdByPath: new Map(COVERED_PATHS.map((path, index) => [path, `file-${String(index + 1)}`])),
  filterValues: [],
  ...overrides,
})

const outlineOf = (rows: readonly FileExplorerRow[]): string[] =>
  rows.map((row) => `${"  ".repeat(row.depth)}${row.kind === "folder" ? `${row.name}/` : row.name}`)

const fileRowOf = (rows: readonly FileExplorerRow[], path: string): Extract<FileExplorerRow, { kind: "file" }> | undefined =>
  rows.flatMap((row) => (row.kind === "file" && row.id === path ? [row] : []))[0]

describe("buildFileExplorer", () => {
  it("sorts folders before files, each by name, and merges a folder that only holds one folder", () => {
    expect(outlineOf(buildFileExplorer(sourceOf()).rows)).toStrictEqual([
      "src/pokedex/",
      "  pokemon/",
      "    models.py",
      "    schemas.py",
      "    service.py",
      "  main.py",
      "tests/",
      "  test_pokemon.py",
      "pyproject.toml",
    ])
  })

  it("names the folders a row sits in, so a folded folder can hide them", () => {
    const { rows } = buildFileExplorer(sourceOf())
    expect(fileRowOf(rows, "src/pokedex/pokemon/models.py")?.ancestorIds).toStrictEqual(["src/pokedex", "src/pokedex/pokemon"])
    expect(fileRowOf(rows, "pyproject.toml")?.ancestorIds).toStrictEqual([])
  })

  it("gives a file its language icon, its change and the anchor of its code panel", () => {
    expect(fileRowOf(buildFileExplorer(sourceOf()).rows, "src/pokedex/main.py")).toMatchObject({
      icon: { kind: "python", label: "Python" },
      change: { kind: "modified", label: "Modified" },
      anchorId: "file-2",
      noteLabel: null,
    })
  })

  it("lists a changed file the walkthrough leaves out, with no anchor and a note", () => {
    const explorer = buildFileExplorer(sourceOf())
    expect(fileRowOf(explorer.rows, "pyproject.toml")).toMatchObject({ icon: { kind: "toml" }, anchorId: null, noteLabel: "Not covered", reviewed: null })
    expect(explorer.summary).toStrictEqual(["6 files", "1 not in the walkthrough"])
  })

  it("counts the reviewed waypoints of a file and names its marks", () => {
    const summaries = [summaryOf("src/pokedex/pokemon/schemas.py", { waypointCount: 14, reviewedCount: 3, markKinds: ["bug", "core-change"] })]
    expect(fileRowOf(buildFileExplorer(sourceOf({ summaries })).rows, "src/pokedex/pokemon/schemas.py")).toMatchObject({
      reviewed: { count: 3, total: 14, label: "3 of 14 waypoints reviewed" },
      marks: [{ kind: "bug", label: "Bug" }, { kind: "core-change", label: "Core change" }],
    })
  })

  it("leaves out the files the filter hides, counts them and names the filter", () => {
    const summaries = COVERED_PATHS.map((path) =>
      summaryOf(path, path.endsWith("schemas.py") ? { matchCount: 1 } : { matchCount: 0, isShown: false }))
    const explorer = buildFileExplorer(sourceOf({ summaries, filterValues: ["Bug", "Core change"] }))
    expect(outlineOf(explorer.rows)).toStrictEqual(["src/pokedex/pokemon/", "  schemas.py", "pyproject.toml"])
    expect(explorer.summary).toStrictEqual(["2 of 6 files", "1 not in the walkthrough"])
    expect(explorer.hiddenLabel).toBe("4 files hidden by the filter")
    expect(explorer.filter).toStrictEqual({ label: "Filtered by", values: ["Bug", "Core change"], clearLabel: "Clear" })
    expect(fileRowOf(explorer.rows, "src/pokedex/pokemon/schemas.py")?.match).toStrictEqual({ count: 1, label: "1 waypoint matches the filter" })
  })

  it("says reviewed files are hidden when no filter is ticked", () => {
    const summaries = COVERED_PATHS.map((path) => summaryOf(path, { isShown: !path.startsWith("tests/") }))
    const explorer = buildFileExplorer(sourceOf({ summaries }))
    expect(explorer.hiddenLabel).toBe("1 reviewed file hidden")
    expect(explorer.filter).toBeNull()
    expect(fileRowOf(explorer.rows, "src/pokedex/main.py")?.match).toBeNull()
  })
})
