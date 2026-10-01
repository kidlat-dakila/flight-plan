import { fireEvent, render, screen } from "@testing-library/react"
import DiagramConfigurationBar, { type DiagramConfiguration } from "@/components/DiagramConfigurationBar"

const CONFIGURATION: DiagramConfiguration = {
  label: "Journey Flow Diagram configuration",
  levels: {
    label: "Tail Node levels",
    options: [
      { label: "All", value: null, isSelected: true },
      { label: "None", value: 0, isSelected: false },
      { label: "1", value: 1, isSelected: false },
    ],
  },
  toggles: [
    { key: "data", label: "Data connections", countLabel: "1 connection", isOn: false },
    { key: "assumed", label: "Assumed connections", countLabel: "2 connections", isOn: true },
  ],
}

describe("DiagramConfigurationBar", () => {
  it("shows the level options with the selected one checked, and reports a new choice", () => {
    const onLevelsChange = vi.fn()
    render(<DiagramConfigurationBar configuration={CONFIGURATION} onLevelsChange={onLevelsChange} onToggle={vi.fn()} />)

    expect(screen.getByRole("radio", { name: "All" })).toHaveProperty("checked", true)

    fireEvent.click(screen.getByRole("radio", { name: "None" }))

    expect(onLevelsChange).toHaveBeenCalledWith(0)
  })

  it("shows each connection toggle with its count, and reports a switch", () => {
    const onToggle = vi.fn()
    render(<DiagramConfigurationBar configuration={CONFIGURATION} onLevelsChange={vi.fn()} onToggle={onToggle} />)

    expect(screen.getByText("2 connections")).toBeTruthy()
    expect(screen.getByRole("checkbox", { name: /Assumed connections/ })).toHaveProperty("checked", true)

    fireEvent.click(screen.getByRole("checkbox", { name: /Data connections/ }))

    expect(onToggle).toHaveBeenCalledWith("data", true)
  })

  it("leaves the level control out when there is nothing to choose", () => {
    render(<DiagramConfigurationBar configuration={{ ...CONFIGURATION, levels: null }} onLevelsChange={vi.fn()} onToggle={vi.fn()} />)

    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.getAllByRole("checkbox")).toHaveLength(2)
  })
})
