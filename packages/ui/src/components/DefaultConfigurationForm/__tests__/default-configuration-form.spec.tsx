import { fireEvent, render, screen } from "@testing-library/react"
import DefaultConfigurationForm from "@/components/DefaultConfigurationForm"

const PRESETS = [
  { preset: "standard" as const, label: "Standard", bestFor: "Best for general pull requests.", description: "The full review.", note: null },
  { preset: "minimal" as const, label: "Minimal", bestFor: "Best for saving tokens.", description: "Few words and no filler.", note: "Diagrams are off by default." },
]

describe("DefaultConfigurationForm", () => {
  it("shows each configuration with what it is best for and ticks the selected one", () => {
    render(
      <DefaultConfigurationForm presets={PRESETS} selectedPreset="minimal" onSubmit={vi.fn()}>
        <button type="submit">Save</button>
      </DefaultConfigurationForm>,
    )

    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Minimal/ }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(false)
    expect(screen.getByText("Best for general pull requests.")).toBeTruthy()
    expect(screen.getByText("Diagrams are off by default.")).toBeTruthy()
  })

  it("submits the configuration the user picks through the actions it is given", () => {
    const onSubmit = vi.fn()
    render(
      <DefaultConfigurationForm presets={PRESETS} selectedPreset="minimal" onSubmit={onSubmit}>
        <button type="submit">Save</button>
      </DefaultConfigurationForm>,
    )

    fireEvent.click(screen.getByRole("radio", { name: /Standard/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith("standard")
  })
})
