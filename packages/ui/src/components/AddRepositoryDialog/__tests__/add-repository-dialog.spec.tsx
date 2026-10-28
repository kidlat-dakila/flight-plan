import { fireEvent, render, screen, within } from "@testing-library/react"
import AddRepositoryDialog, { type FolderBrowse, type FolderSearch } from "@/components/AddRepositoryDialog"
import type { BaseBranchChoice } from "@/components/BaseBranchField"
import type { AuthorsChoice } from "@/components/RepositoryAuthors"

const IDLE_SEARCH: FolderSearch = { query: "", options: [], message: null }
const CLOSED_BROWSE: FolderBrowse = { isOpen: false, browser: null, errorMessage: null }
const LOCAL_GIT_AUTHORS: AuthorsChoice = {
  form: {
    gitSelfAuthor: null,
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
  trackedAuthors: [],
  search: { role: null, query: "", options: [], message: null, errorMessage: null },
}
const DETECTED_BASE_BRANCH: BaseBranchChoice = {
  branchName: "main",
  search: {
    query: "",
    options: [{ id: "develop", label: "develop", detail: "3 days ago", stateLabel: null, isDisabled: false }],
    message: null,
    errorMessage: null,
  },
}

interface DialogOverrides {
  readonly isOpen?: boolean
  readonly search?: Partial<FolderSearch>
  readonly browse?: Partial<FolderBrowse>
  readonly authors?: Partial<AuthorsChoice>
  readonly baseBranch?: BaseBranchChoice | null
  readonly isAdding?: boolean
  readonly errorMessage?: string | null
}

const renderDialog = (overrides: DialogOverrides = {}) => {
  const handlers = {
    onQueryChange: vi.fn(),
    onChooseFolder: vi.fn(),
    onAuthorQueryChange: vi.fn(),
    onAuthorSelect: vi.fn(),
    onTrackedAuthorRemove: vi.fn(),
    onBaseBranchQueryChange: vi.fn(),
    onBaseBranchChange: vi.fn(),
    onSubmit: vi.fn(),
    onBrowse: vi.fn(),
    onBrowseFolder: vi.fn(),
    onBrowseClose: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <AddRepositoryDialog
      isOpen={overrides.isOpen ?? true}
      search={{ ...IDLE_SEARCH, ...overrides.search }}
      browse={{ ...CLOSED_BROWSE, ...overrides.browse }}
      authors={{ ...LOCAL_GIT_AUTHORS, ...overrides.authors }}
      baseBranch={overrides.baseBranch ?? null}
      isAdding={overrides.isAdding ?? false}
      errorMessage={overrides.errorMessage ?? null}
      {...handlers}
    />,
  )
  return handlers
}

describe("AddRepositoryDialog", () => {
  it("asks for the folder of a repository, with an example path", () => {
    renderDialog()

    expect(screen.getByRole("heading", { name: "Add repository" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Repository folder" }).getAttribute("placeholder")).toBe("/Users/you/projects/storefront")
  })

  it("renders nothing while it is closed", () => {
    renderDialog({ isOpen: false })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("reports what is typed", () => {
    const { onQueryChange } = renderDialog()

    fireEvent.change(screen.getByRole("combobox", { name: "Repository folder" }), { target: { value: "/work/docs" } })

    expect(onQueryChange).toHaveBeenCalledWith("/work/docs")
  })

  it("submits with the Add button and with Enter in the folder field", () => {
    const { onSubmit } = renderDialog({ search: { query: "/work/docs-site" } })

    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Repository folder" }), { key: "Enter" })

    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it("offers the folders found, chooses one that is picked without adding it, and leaves an added one disabled", () => {
    const { onChooseFolder, onSubmit } = renderDialog({
      search: {
        query: "do",
        options: [
          { path: "/work/docs-site", name: "docs-site", isAdded: false, stateLabel: null },
          { path: "/work/storefront", name: "storefront", isAdded: true, stateLabel: "Added" },
        ],
      },
    })
    fireEvent.focus(screen.getByRole("combobox", { name: "Repository folder" }))

    fireEvent.click(screen.getByRole("option", { name: /storefront/ }))
    expect(onChooseFolder).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("option", { name: /docs-site/ }))

    expect(onChooseFolder).toHaveBeenCalledWith("/work/docs-site")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the backend's rejection above the buttons", () => {
    renderDialog({ errorMessage: "Pick which user you are in notes." })

    expect(screen.getByRole("alert").textContent).toBe("Pick which user you are in notes.")
  })

  it("says it is adding and cannot be submitted again meanwhile", () => {
    renderDialog({ isAdding: true })

    expect(screen.getByRole("button", { name: "Adding…" })).toHaveProperty("disabled", true)
  })

  it("closes with Cancel", () => {
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("starts browsing with Browse folders", () => {
    const { onBrowse } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Browse folders" }))

    expect(onBrowse).toHaveBeenCalledTimes(1)
  })

  it("lists the folders being browsed, opens one, and chooses a repository from the list", () => {
    const { onBrowseFolder, onChooseFolder } = renderDialog({
      browse: {
        isOpen: true,
        browser: {
          path: "/work",
          parentPath: "/",
          message: null,
          folders: [
            { name: "archive", path: "/work/archive", kind: "folder", kindLabel: "Folder" },
            { name: "docs-site", path: "/work/docs-site", kind: "repository", kindLabel: "Repository" },
          ],
        },
      },
    })
    const browser = within(screen.getByRole("dialog", { name: "Browse folders" }))

    fireEvent.click(browser.getByRole("button", { name: "Open archive" }))
    fireEvent.click(browser.getByRole("button", { name: "Up one folder" }))
    fireEvent.click(browser.getByRole("button", { name: "Choose docs-site" }))

    expect(onBrowseFolder).toHaveBeenNthCalledWith(1, "/work/archive")
    expect(onBrowseFolder).toHaveBeenNthCalledWith(2, "/")
    expect(onChooseFolder).toHaveBeenCalledWith("/work/docs-site")
  })

  it("closes only the suggestion list when Escape is pressed with the list open, and the dialog when it is not", () => {
    const { onClose } = renderDialog({
      search: { options: [{ path: "/work/docs-site", name: "docs-site", isAdded: false, stateLabel: null }] },
    })
    const field = screen.getByRole("combobox", { name: "Repository folder" })

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
    expect(field.getAttribute("aria-expanded")).toBe("false")

    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("asks about the authors under the folder, with the form of the backend", () => {
    renderDialog()

    expect(screen.getByRole("combobox", { name: "Track branches from specific team members" })).toBeTruthy()
  })

  it("asks for the branch to compare with only once a folder is picked", () => {
    renderDialog()

    expect(screen.queryByRole("combobox", { name: "Branch to compare with" })).toBeNull()
  })

  it("starts the branch to compare with on the one the backend detected, and reports a search and a choice", () => {
    const { onBaseBranchQueryChange, onBaseBranchChange } = renderDialog({ baseBranch: DETECTED_BASE_BRANCH })
    const field = screen.getByRole<HTMLInputElement>("combobox", { name: "Branch to compare with" })

    expect(field.value).toBe("main")
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "dev" } })
    fireEvent.click(screen.getByRole("option", { name: /develop/ }))

    expect(onBaseBranchQueryChange).toHaveBeenLastCalledWith("dev")
    expect(onBaseBranchChange).toHaveBeenCalledWith("develop")
  })

  it("closes only the branch list when Escape is pressed with it open", () => {
    const { onClose } = renderDialog({ baseBranch: DETECTED_BASE_BRANCH })
    const field = screen.getByRole("combobox", { name: "Branch to compare with" })

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
    expect(field.getAttribute("aria-expanded")).toBe("false")

    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
