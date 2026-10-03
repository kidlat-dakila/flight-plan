import { fireEvent, render, screen } from "@testing-library/react"
import SuggestionField, { type Suggestion } from "@/components/SuggestionField"

const SUGGESTIONS: readonly Suggestion[] = [
  { id: "lena", label: "Lena Okafor", detail: "lena@acme.example", stateLabel: "Tracked", isDisabled: true },
  { id: "teo", label: "Teo Marchetti", detail: "teo@acme.example", stateLabel: null, isDisabled: false },
  { id: "mira", label: "Mira Sandoval", detail: null, stateLabel: null, isDisabled: false },
]

interface FieldOverrides {
  readonly suggestions?: readonly Suggestion[]
  readonly message?: string | null
  readonly errorMessage?: string | null
  readonly onValueChange?: (value: string) => void
  readonly onSelect?: (id: string) => void
  readonly onOpen?: () => void
  readonly onEnter?: () => void
}

const renderField = (overrides: FieldOverrides = {}) =>
  render(
    <SuggestionField
      label="Track an author"
      hint="Searches the authors of the last 1,000 commits."
      placeholder="Type a name"
      value=""
      suggestions={overrides.suggestions ?? SUGGESTIONS}
      message={overrides.message ?? null}
      errorMessage={overrides.errorMessage ?? null}
      onValueChange={overrides.onValueChange ?? vi.fn()}
      onSelect={overrides.onSelect ?? vi.fn()}
      onOpen={overrides.onOpen ?? vi.fn()}
      onEnter={overrides.onEnter}
    />,
  )

describe("SuggestionField", () => {
  it("is a labelled field that keeps its suggestions closed until it is used", () => {
    renderField()

    const field = screen.getByRole("combobox", { name: "Track an author" })

    expect(field.getAttribute("aria-expanded")).toBe("false")
    expect(screen.getByText("Searches the authors of the last 1,000 commits.")).toBeTruthy()
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("reports what is typed", () => {
    const onValueChange = vi.fn()
    renderField({ onValueChange })

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "teo" } })

    expect(onValueChange).toHaveBeenCalledWith("teo")
  })

  it("lists each suggestion with its detail and state when the field is focused", () => {
    renderField()

    fireEvent.focus(screen.getByRole("combobox"))

    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("true")
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      "Lena Okaforlena@acme.exampleTracked",
      "Teo Marchettiteo@acme.example",
      "Mira Sandoval",
    ])
    expect(screen.getByRole("option", { name: /Lena Okafor/ }).getAttribute("aria-disabled")).toBe("true")
  })

  it("reports that it was opened, so its suggestions can be loaded", () => {
    const onOpen = vi.fn()
    renderField({ onOpen })

    fireEvent.focus(screen.getByRole("combobox"))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("selects a clicked suggestion and closes the list", () => {
    const onSelect = vi.fn()
    renderField({ onSelect })

    fireEvent.focus(screen.getByRole("combobox"))
    fireEvent.click(screen.getByRole("option", { name: /Teo Marchetti/ }))

    expect(onSelect).toHaveBeenCalledWith("teo")
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("selects with the arrow keys and Enter, and wraps past the last suggestion", () => {
    const onSelect = vi.fn()
    renderField({ onSelect })
    const field = screen.getByRole("combobox")

    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "ArrowDown" })

    expect(screen.getByRole("option", { name: /Teo Marchetti/ }).getAttribute("aria-selected")).toBe("true")

    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "ArrowUp" })
    fireEvent.keyDown(field, { key: "Enter" })

    expect(onSelect).toHaveBeenCalledWith("mira")
  })

  it("does not select a suggestion that is disabled", () => {
    const onSelect = vi.fn()
    renderField({ onSelect })
    const field = screen.getByRole("combobox")

    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.click(screen.getByRole("option", { name: /Lena Okafor/ }))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it("closes the list on Escape", () => {
    renderField()
    const field = screen.getByRole("combobox")

    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "Escape" })

    expect(screen.queryByRole("option")).toBeNull()
  })

  it("shows a message in place of the suggestions when there are none", () => {
    renderField({ suggestions: [], message: "No author matches “zed”." })

    fireEvent.focus(screen.getByRole("combobox"))

    expect(screen.getByText("No author matches “zed”.")).toBeTruthy()
  })

  it("announces an error and marks the field invalid", () => {
    renderField({ errorMessage: "This repository is no longer in the setup." })

    expect(screen.getByRole("alert").textContent).toBe("This repository is no longer in the setup.")
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe("true")
  })

  it("tells that Enter was pressed when no suggestion is active, and picks the active one otherwise", () => {
    const onEnter = vi.fn()
    const onSelect = vi.fn()
    renderField({ onEnter, onSelect })
    const field = screen.getByRole("combobox")

    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.focus(field)
    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "ArrowDown" })
    fireEvent.keyDown(field, { key: "Enter" })

    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith("teo")
  })
})
