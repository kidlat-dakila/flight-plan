import { fireEvent, render, screen } from "@testing-library/react"
import SelectField from "@/components/SelectField"

const OPTIONS = [
  { value: "default", label: "Your Claude default" },
  { value: "opus", label: "Opus" },
]

describe("SelectField", () => {
  it("shows a labelled select with every option and the chosen one selected", () => {
    render(<SelectField label="Model for Claude" options={OPTIONS} value="opus" onChange={vi.fn()} />)

    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Model for Claude" })

    expect(select.value).toBe("opus")
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["Your Claude default", "Opus"])
  })

  it("keeps the label as the accessible name when it is hidden from view", () => {
    render(<SelectField label="Model for Claude" options={OPTIONS} value="opus" isLabelHidden onChange={vi.fn()} />)

    expect(screen.getByText("Model for Claude").className).toBe("sr-only")
    expect(screen.getByRole("combobox", { name: "Model for Claude" })).toBeDefined()
  })

  it("reports the option the user picks", () => {
    const onChange = vi.fn()
    render(<SelectField label="Model for Claude" options={OPTIONS} value="opus" onChange={onChange} />)

    fireEvent.change(screen.getByRole("combobox", { name: "Model for Claude" }), { target: { value: "default" } })

    expect(onChange).toHaveBeenCalledWith("default")
  })

  it("marks the select invalid and describes it with the error message", () => {
    render(
      <SelectField
        label="Model for Claude"
        options={OPTIONS}
        value="opus"
        errorMessage="Choose one of the models Claude offers."
        onChange={vi.fn()}
      />,
    )

    const select = screen.getByRole("combobox", { name: "Model for Claude" })

    expect(select.getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByRole("alert").textContent).toBe("Choose one of the models Claude offers.")
    expect(select.getAttribute("aria-describedby")).toBe(screen.getByText("Choose one of the models Claude offers.").id)
  })

  it("shows no error and is valid when there is no error message", () => {
    render(<SelectField label="Model for Claude" options={OPTIONS} value="opus" onChange={vi.fn()} />)

    expect(screen.getByRole("combobox", { name: "Model for Claude" }).getAttribute("aria-invalid")).toBe("false")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
