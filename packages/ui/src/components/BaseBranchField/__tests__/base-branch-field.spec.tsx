import { fireEvent, render, screen } from "@testing-library/react"
import BaseBranchField, { type BranchOption, type BranchSearch } from "@/components/BaseBranchField"

const OPTIONS: readonly BranchOption[] = [
  { id: "main", label: "main", detail: "2 hours ago", stateLabel: "Compared with", isDisabled: true },
  { id: "develop", label: "develop", detail: "3 days ago", stateLabel: null, isDisabled: false },
]

const IDLE_SEARCH: BranchSearch = { query: "", options: OPTIONS, message: null, errorMessage: null }

interface FieldOverrides {
  readonly baseBranch?: string | null
  readonly search?: Partial<BranchSearch>
}

const renderField = (overrides: FieldOverrides = {}) => {
  const handlers = { onQueryChange: vi.fn(), onBaseBranchChange: vi.fn() }
  const { container } = render(
    <BaseBranchField
      baseBranch={overrides.baseBranch === undefined ? "main" : overrides.baseBranch}
      search={{ ...IDLE_SEARCH, ...overrides.search }}
      {...handlers}
    />,
  )
  return { ...handlers, container, field: screen.getByRole<HTMLInputElement>("combobox", { name: "Branch to compare with" }) }
}

describe("BaseBranchField", () => {
  it("shows the branch feature branches are compared with, and says what it is for", () => {
    const { field } = renderField()

    expect(field.value).toBe("main")
    expect(field.getAttribute("aria-expanded")).toBe("false")
    expect(screen.getByText("Flight Plan compares the changes in a feature branch against this branch.")).toBeTruthy()
  })

  it("reads as a select, with a chevron at its end", () => {
    const { container } = renderField()

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })

  it("opens the list again when the field is clicked after Escape", () => {
    const { field } = renderField()

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })
    fireEvent.click(field)

    expect(field.getAttribute("aria-expanded")).toBe("true")
  })

  it("asks for a branch when none could be detected", () => {
    const { field } = renderField({ baseBranch: null })

    expect(field.value).toBe("")
    expect(field.getAttribute("placeholder")).toBe("Choose a branch")
  })

  it("opens every branch on focus, with the time of its last commit, and selects the name so typing replaces it", () => {
    const { field, onQueryChange } = renderField()

    fireEvent.focus(field)

    expect(onQueryChange).toHaveBeenCalledWith("")
    expect(field.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("option", { name: /develop/ }).textContent).toContain("3 days ago")
    expect([field.selectionStart, field.selectionEnd]).toStrictEqual([0, "main".length])
  })

  it("shows what is typed while searching, and the chosen branch again once the field is left", () => {
    const { field, onQueryChange } = renderField({ search: { query: "dev" } })

    fireEvent.focus(field)
    expect(field.value).toBe("main")
    fireEvent.change(field, { target: { value: "dev" } })

    expect(onQueryChange).toHaveBeenLastCalledWith("dev")
    expect(field.value).toBe("dev")
    fireEvent.blur(field)
    expect(field.value).toBe("main")
  })

  it("compares with the branch chosen, and shows it again", () => {
    const { field, onBaseBranchChange } = renderField({ search: { query: "dev" } })

    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "dev" } })
    fireEvent.click(screen.getByRole("option", { name: /develop/ }))

    expect(onBaseBranchChange).toHaveBeenCalledWith("develop")
    expect(field.value).toBe("main")
    expect(field.getAttribute("aria-expanded")).toBe("false")
  })

  it("chooses with the arrow keys and Enter, and leaves a disabled branch alone", () => {
    const { field, onBaseBranchChange } = renderField()

    fireEvent.focus(field)
    fireEvent.click(screen.getByRole("option", { name: /main/ }))
    expect(onBaseBranchChange).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "Enter" })
    expect(onBaseBranchChange).toHaveBeenCalledWith("develop")
  })

  it("shows the message when no branch matches", () => {
    const { field } = renderField({ search: { options: [], message: "No branch matches “relese”." } })

    fireEvent.focus(field)

    expect(screen.getByText("No branch matches “relese”.")).toBeTruthy()
  })

  it("shows a failed search under the field, with a way to troubleshoot it", () => {
    const onTroubleshoot = vi.fn()
    renderField({ search: { options: [], errorMessage: "Could not read the branches of storefront.", onTroubleshoot } })

    expect(screen.getByRole("alert").textContent).toContain("Could not read the branches of storefront.")
    fireEvent.click(screen.getByRole("button", { name: /Troubleshoot/ }))
    expect(onTroubleshoot).toHaveBeenCalledTimes(1)
  })

  it("closes the list with Escape without changing the branch", () => {
    const { field, onBaseBranchChange } = renderField()

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })

    expect(field.getAttribute("aria-expanded")).toBe("false")
    expect(field.value).toBe("main")
    expect(onBaseBranchChange).not.toHaveBeenCalled()
  })
})
