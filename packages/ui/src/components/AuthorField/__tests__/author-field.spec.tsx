import { fireEvent, render, screen } from "@testing-library/react"
import AuthorField, { type AuthorOption } from "@/components/AuthorField"

const OPTIONS: readonly AuthorOption[] = [
  {
    id: "lena@acme.example",
    name: "Lena Okafor",
    detail: "lena@acme.example",
    avatarUrl: null,
    monogram: "LO",
    isTaken: true,
    stateLabel: "Tracked",
  },
  {
    id: "teo@acme.example",
    name: "Teo Marchetti",
    detail: "teo@acme.example",
    avatarUrl: null,
    monogram: "TM",
    isTaken: false,
    stateLabel: null,
  },
]

interface FieldOverrides {
  readonly query?: string
  readonly options?: readonly AuthorOption[]
  readonly message?: string | null
  readonly errorMessage?: string | null
}

const renderField = (overrides: FieldOverrides = {}) => {
  const handlers = { onQueryChange: vi.fn(), onOpen: vi.fn(), onSelect: vi.fn() }
  render(
    <AuthorField
      label="Track specific team members in storefront"
      hint="Search by name or email."
      placeholder="Type a name or email"
      query={overrides.query ?? ""}
      options={overrides.options ?? OPTIONS}
      message={overrides.message ?? null}
      errorMessage={overrides.errorMessage ?? null}
      {...handlers}
    />,
  )
  return handlers
}

describe("AuthorField", () => {
  it("is a labelled search with the hint and placeholder it is given", () => {
    renderField()

    const field = screen.getByRole("combobox", { name: "Track specific team members in storefront" })
    expect(field.getAttribute("placeholder")).toBe("Type a name or email")
    expect(screen.getByText("Search by name or email.")).toBeTruthy()
  })

  it("reports what is typed and when the field is opened", () => {
    const { onQueryChange, onOpen } = renderField()
    const field = screen.getByRole("combobox")

    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "te" } })

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onQueryChange).toHaveBeenCalledWith("te")
  })

  it("offers the authors found with their detail, selects one that is free and leaves a taken one disabled", () => {
    const { onSelect } = renderField()
    fireEvent.focus(screen.getByRole("combobox"))

    const taken = screen.getByRole("option", { name: /Lena Okafor/ })
    expect(taken.getAttribute("aria-disabled")).toBe("true")
    expect(taken.textContent).toContain("Tracked")
    fireEvent.click(taken)
    expect(onSelect).not.toHaveBeenCalled()

    const free = screen.getByRole("option", { name: /Teo Marchetti/ })
    expect(free.textContent).toContain("teo@acme.example")
    fireEvent.click(free)
    expect(onSelect).toHaveBeenCalledWith("teo@acme.example")
  })

  it("shows the message when nobody was found, and the error under the field", () => {
    renderField({ options: [], message: "Nobody matching “zed” has committed here.", errorMessage: "Could not search." })
    fireEvent.focus(screen.getByRole("combobox"))

    expect(screen.getByText("Nobody matching “zed” has committed here.")).toBeTruthy()
    expect(screen.getByRole("alert").textContent).toBe("Could not search.")
  })
})
