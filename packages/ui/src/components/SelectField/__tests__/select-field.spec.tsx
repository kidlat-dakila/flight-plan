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

  it("reports the option the user picks", () => {
    const onChange = vi.fn()
    render(<SelectField label="Model for Claude" options={OPTIONS} value="opus" onChange={onChange} />)

    fireEvent.change(screen.getByRole("combobox", { name: "Model for Claude" }), { target: { value: "default" } })

    expect(onChange).toHaveBeenCalledWith("default")
  })
})
