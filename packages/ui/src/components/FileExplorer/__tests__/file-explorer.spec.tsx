import { fireEvent, render, screen, within } from "@testing-library/react"
import FileExplorer, { visibleRowsOf, type ExplorerRow, type FileExplorerView } from "@/components/FileExplorer"

const fileRow = (id: string, depth: number, ancestorIds: readonly string[], overrides: Partial<Extract<ExplorerRow, { kind: "file" }>> = {}): ExplorerRow => ({
  kind: "file",
  id,
  name: id.slice(id.lastIndexOf("/") + 1),
  depth,
  ancestorIds,
  icon: { kind: "python", label: "Python" },
  change: { kind: "added", label: "Added" },
  anchorId: `file-${id}`,
  noteLabel: null,
  marks: [],
  reviewed: { count: 3, total: 14, label: "3 of 14 waypoints reviewed" },
  match: null,
  ...overrides,
})

const ROWS: readonly ExplorerRow[] = [
  { kind: "folder", id: "src/pokedex", name: "src/pokedex", depth: 0, ancestorIds: [] },
  { kind: "folder", id: "src/pokedex/pokemon", name: "pokemon", depth: 1, ancestorIds: ["src/pokedex"] },
  fileRow("src/pokedex/pokemon/schemas.py", 2, ["src/pokedex", "src/pokedex/pokemon"], { marks: [{ kind: "bug", label: "Bug" }] }),
  fileRow("src/pokedex/main.py", 1, ["src/pokedex"], { change: { kind: "modified", label: "Modified" } }),
  fileRow("pyproject.toml", 0, [], { anchorId: null, noteLabel: "Not covered", reviewed: null, icon: { kind: "toml", label: "TOML" } }),
]

const EXPLORER: FileExplorerView = { summary: ["3 files", "1 not in the walkthrough"], filter: null, hiddenLabel: null, rows: ROWS }

const LABELS = { label: "Changed files", hideLabel: "Hide changed files", showLabel: "Show changed files" }

const renderExplorer = (explorer: FileExplorerView = EXPLORER, currentAnchorId: string | null = null) =>
  render(
    <FileExplorer
      labels={LABELS}
      shortcutLabel="Ctrl+E"
      explorer={explorer}
      currentAnchorId={currentAnchorId}
      filterNavigation={null}
      onOpenFile={vi.fn()}
      onHide={vi.fn()}
      onClearFilter={vi.fn()}
    />,
  )

describe("visibleRowsOf", () => {
  it("hides every row inside a folded folder", () => {
    expect(visibleRowsOf(ROWS, new Set(["src/pokedex/pokemon"])).map((row) => row.id)).toStrictEqual([
      "src/pokedex",
      "src/pokedex/pokemon",
      "src/pokedex/main.py",
      "pyproject.toml",
    ])
  })
})

describe("FileExplorer", () => {
  it("links each file to its code panel and marks the one being read", () => {
    renderExplorer(EXPLORER, "file-src/pokedex/main.py")

    const main = screen.getByRole("link", { name: /main\.py/ })
    expect(main.getAttribute("href")).toBe("#file-src/pokedex/main.py")
    expect(main.getAttribute("aria-current")).toBe("location")
    expect(screen.getByRole("link", { name: /schemas\.py/ }).getAttribute("aria-current")).toBeNull()
  })

  it("names a file's language, its change and its marks for assistive technology", () => {
    renderExplorer()

    const schemas = screen.getByRole("link", { name: /schemas\.py/ })
    expect(within(schemas).getByText("Python • Added")).toBeTruthy()
    expect(within(schemas).getByText("Bug")).toBeTruthy()
    expect(schemas.querySelector("[data-change='added']")).not.toBeNull()
  })

  it("opens a file's code panel on a click", () => {
    const onOpenFile = vi.fn()
    render(
      <FileExplorer labels={LABELS} shortcutLabel="Ctrl+E" explorer={EXPLORER} currentAnchorId={null} filterNavigation={null} onOpenFile={onOpenFile} onHide={vi.fn()} onClearFilter={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole("link", { name: /schemas\.py/ }))

    expect(onOpenFile).toHaveBeenCalledWith("file-src/pokedex/pokemon/schemas.py")
  })

  it("draws a folder open while it is unfolded and closed once it is folded", () => {
    renderExplorer()

    const folder = screen.getByRole("button", { name: "pokemon" })
    expect(folder.querySelector("[data-folder-icon='open']")).not.toBeNull()

    fireEvent.click(folder)

    expect(folder.querySelector("[data-folder-icon='closed']")).not.toBeNull()
    expect(screen.queryByRole("link", { name: /schemas\.py/ })).toBeNull()
  })

  it("shows a file the walkthrough leaves out without a link", () => {
    renderExplorer()

    expect(screen.queryByRole("link", { name: /pyproject\.toml/ })).toBeNull()
    expect(screen.getByText("Not covered")).toBeTruthy()
  })

  it("names the filter and clears it", () => {
    const onClearFilter = vi.fn()
    render(
      <FileExplorer
        labels={LABELS}
        shortcutLabel="Ctrl+E"
        explorer={{ ...EXPLORER, filter: { label: "Filtered by", values: ["Bug", "Core change"], clearLabel: "Clear" }, hiddenLabel: "4 files hidden by the filter" }}
        currentAnchorId={null}
        filterNavigation={null}
        onOpenFile={vi.fn()}
        onHide={vi.fn()}
        onClearFilter={onClearFilter}
      />,
    )

    expect(screen.getByText("4 files hidden by the filter")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(onClearFilter).toHaveBeenCalledTimes(1)
  })
})
