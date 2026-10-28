import { fireEvent, render, screen } from "@testing-library/react"
import type { BaseBranchChoice } from "@/components/BaseBranchField"
import ConfigureRepositoryDialog from "@/components/ConfigureRepositoryDialog"
import type { AuthorsChoice } from "@/components/RepositoryAuthors"

const AUTHORS: AuthorsChoice = {
  form: {
    gitSelfAuthor: { author: { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" } },
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
  trackedAuthors: [{ id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }],
  search: { role: null, query: "", options: [], message: null, errorMessage: null },
}
const SAVED_BASE_BRANCH: BaseBranchChoice = {
  branchName: "develop",
  search: {
    query: "",
    options: [{ id: "release/2.x", label: "release/2.x", detail: "yesterday", stateLabel: null, isDisabled: false }],
    message: null,
    errorMessage: null,
  },
}

interface DialogOverrides {
  readonly isOpen?: boolean
  readonly authors?: Partial<AuthorsChoice>
  readonly isSaving?: boolean
  readonly isRemoving?: boolean
  readonly errorMessage?: string | null
}

const renderDialog = (overrides: DialogOverrides = {}) => {
  const handlers = {
    onAuthorQueryChange: vi.fn(),
    onAuthorSelect: vi.fn(),
    onTrackedAuthorRemove: vi.fn(),
    onBaseBranchQueryChange: vi.fn(),
    onBaseBranchChange: vi.fn(),
    onSave: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <ConfigureRepositoryDialog
      isOpen={overrides.isOpen ?? true}
      name="storefront"
      path="/Users/dev/projects/storefront"
      configurationHref="/pr-reviews/storefront/configurations"
      authors={{ ...AUTHORS, ...overrides.authors }}
      baseBranch={SAVED_BASE_BRANCH}
      isSaving={overrides.isSaving ?? false}
      isRemoving={overrides.isRemoving ?? false}
      errorMessage={overrides.errorMessage ?? null}
      {...handlers}
    />,
  )
  return handlers
}

describe("ConfigureRepositoryDialog", () => {
  it("is named after the repository and shows its folder, which cannot be changed", () => {
    renderDialog()

    expect(screen.getByRole("heading", { name: "Configure storefront" })).toBeTruthy()
    expect(screen.getByText("/Users/dev/projects/storefront")).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Repository folder" })).toBeNull()
  })

  it("renders nothing while it is closed", () => {
    renderDialog({ isOpen: false })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows the git config user and the tracked users, and lets the tracked ones be changed", () => {
    const { onTrackedAuthorRemove } = renderDialog()

    expect(screen.getByText("Dev Harper")).toBeTruthy()
    expect(screen.getByText("Lena Okafor")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Stop tracking Lena Okafor" }))

    expect(onTrackedAuthorRemove).toHaveBeenCalledWith("lena@acme.example")
  })

  it("links to the prompt configurations of the repository", () => {
    renderDialog()

    expect(screen.getByRole("link", { name: "Prompt configurations" }).getAttribute("href")).toBe(
      "/pr-reviews/storefront/configurations",
    )
  })

  it("saves with the Save button", () => {
    const { onSave } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("says it is saving and cannot be saved again meanwhile", () => {
    renderDialog({ isSaving: true })

    expect(screen.getByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true)
  })

  it("shows the backend's rejection above the buttons", () => {
    renderDialog({ errorMessage: "Pick which user you are in storefront." })

    expect(screen.getByRole("alert").textContent).toBe("Pick which user you are in storefront.")
  })

  it("closes with Cancel", () => {
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("asks to confirm before removing, and keeps the repository when told to", () => {
    const { onRemove } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Remove repository" }))

    expect(screen.getByText("Remove storefront from Flight Plan? Its folder on disk is not touched.")).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Keep" }))

    expect(screen.queryByText("Remove storefront from Flight Plan? Its folder on disk is not touched.")).toBeNull()
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it("removes the repository once the removal is confirmed", () => {
    const { onRemove } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Remove repository" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("says it is removing and cannot be pressed again meanwhile", () => {
    renderDialog({ isRemoving: true })

    fireEvent.click(screen.getByRole("button", { name: "Remove repository" }))

    expect(screen.getByRole("button", { name: "Removing…" })).toHaveProperty("disabled", true)
  })

  it("closes only the suggestion list when Escape is pressed with the list open, and the dialog when it is not", () => {
    const teo = { ...AUTHORS.trackedAuthors[0], id: "teo@acme.example", name: "Teo Marchetti", isTaken: false, stateLabel: null }
    const { onClose } = renderDialog({
      authors: { search: { role: "tracked", query: "te", options: [teo], message: null, errorMessage: null } },
    })
    const field = screen.getByRole("combobox", { name: "Track branches from specific team members" })

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows the saved branch to compare with, and reports a search and a choice", () => {
    const { onBaseBranchQueryChange, onBaseBranchChange } = renderDialog()
    const field = screen.getByRole<HTMLInputElement>("combobox", { name: "Branch to compare with" })

    expect(field.value).toBe("develop")
    fireEvent.focus(field)
    expect(onBaseBranchQueryChange).toHaveBeenLastCalledWith("")
    fireEvent.change(field, { target: { value: "rel" } })
    fireEvent.click(screen.getByRole("option", { name: /release\/2\.x/ }))

    expect(onBaseBranchQueryChange).toHaveBeenLastCalledWith("rel")
    expect(onBaseBranchChange).toHaveBeenCalledWith("release/2.x")
  })

  it("closes only the branch list when Escape is pressed with it open", () => {
    const { onClose } = renderDialog()
    const field = screen.getByRole("combobox", { name: "Branch to compare with" })

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
