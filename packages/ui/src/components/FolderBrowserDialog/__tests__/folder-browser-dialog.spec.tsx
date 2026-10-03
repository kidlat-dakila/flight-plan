import { fireEvent, render, screen } from "@testing-library/react"
import FolderBrowserDialog, { type FolderBrowser } from "@/components/FolderBrowserDialog"

const BROWSER: FolderBrowser = {
  path: "/work",
  parentPath: "/",
  message: null,
  folders: [
    { name: "archive", path: "/work/archive", kind: "folder", kindLabel: "Folder" },
    { name: "docs-site", path: "/work/docs-site", kind: "repository", kindLabel: "Repository" },
    { name: "storefront", path: "/work/storefront", kind: "added-repository", kindLabel: "Added" },
  ],
}

interface BrowserOverrides {
  readonly browser?: FolderBrowser | null
  readonly errorMessage?: string | null
  readonly onChooseFolder?: ((path: string) => void) | null
}

const renderBrowser = (overrides: BrowserOverrides = {}) => {
  const handlers = { onOpenFolder: vi.fn(), onChooseRepository: vi.fn(), onClose: vi.fn() }
  render(
    <FolderBrowserDialog
      isOpen
      title="Browse folders"
      description="Open folders until you reach a repository."
      browser={overrides.browser === undefined ? BROWSER : overrides.browser}
      errorMessage={overrides.errorMessage ?? null}
      onChooseFolder={overrides.onChooseFolder ?? null}
      {...handlers}
    />,
  )
  return handlers
}

describe("FolderBrowserDialog", () => {
  it("says it is reading while the folder is not there yet", () => {
    renderBrowser({ browser: null })

    expect(screen.getByRole("status").textContent).toBe("Reading the folder…")
  })

  it("opens a folder, goes up one folder and chooses a repository", () => {
    const { onOpenFolder, onChooseRepository } = renderBrowser()

    fireEvent.click(screen.getByRole("button", { name: "Open archive" }))
    fireEvent.click(screen.getByRole("button", { name: "Up one folder" }))
    fireEvent.click(screen.getByRole("button", { name: "Choose docs-site" }))

    expect(onOpenFolder).toHaveBeenNthCalledWith(1, "/work/archive")
    expect(onOpenFolder).toHaveBeenNthCalledWith(2, "/")
    expect(onChooseRepository).toHaveBeenCalledWith("/work/docs-site")
  })

  it("offers no action for a repository that is already added", () => {
    renderBrowser()

    expect(screen.queryByRole("button", { name: "Choose storefront" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Open storefront" })).toBeNull()
  })

  it("has no way up from the top folder", () => {
    renderBrowser({ browser: { ...BROWSER, parentPath: null } })

    expect(screen.queryByRole("button", { name: "Up one folder" })).toBeNull()
  })

  it("shows the message of a folder with nothing to list", () => {
    renderBrowser({ browser: { ...BROWSER, folders: [], message: "This folder has no subfolders." } })

    expect(screen.getByText("This folder has no subfolders.")).toBeTruthy()
  })

  it("shows an error", () => {
    renderBrowser({ errorMessage: "That folder cannot be read." })

    expect(screen.getByRole("alert").textContent).toBe("That folder cannot be read.")
  })

  it("chooses the folder being browsed when the page wants a folder", () => {
    const onChooseFolder = vi.fn()
    renderBrowser({ onChooseFolder })

    fireEvent.click(screen.getByRole("button", { name: "Use this folder" }))

    expect(onChooseFolder).toHaveBeenCalledWith("/work")
  })

  it("does not offer to choose a folder when the page wants a repository", () => {
    renderBrowser()

    expect(screen.queryByRole("button", { name: "Use this folder" })).toBeNull()
  })
})
