import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import LabToolbar from "@/app/lab-toolbar"

type LabToolbarProps = ComponentProps<typeof LabToolbar>

const FIXTURE_OPTIONS = [
  { value: "playground/demo-fastapi/route", label: "playground / demo-fastapi / Implement a route" },
  { value: "lab/express-api/complete", label: "lab / express-api / Complete a task" },
]

const createProps = (overrides: Partial<LabToolbarProps> = {}): LabToolbarProps => ({
  fixtureOptions: FIXTURE_OPTIONS,
  fixtureId: "playground/demo-fastapi/route",
  previousFixtureId: null,
  nextFixtureId: "lab/express-api/complete",
  diagramOptions: [{ value: "segment-1", label: "segment-1" }],
  diagramId: "segment-1",
  statusMessage: null,
  onFixtureChange: vi.fn(),
  onDiagramChange: vi.fn(),
  ...overrides,
})

describe("LabToolbar", () => {
  it("lists every fixture with the chosen one selected", () => {
    render(<LabToolbar {...createProps()} />)
    const select = screen.getByRole("combobox", { name: "Fixture" })

    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toStrictEqual(FIXTURE_OPTIONS.map((option) => option.label))
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Fixture" }).value).toBe("playground/demo-fastapi/route")
  })

  it("chooses the fixture picked in the list", () => {
    const props = createProps()
    render(<LabToolbar {...props} />)

    fireEvent.change(screen.getByRole("combobox", { name: "Fixture" }), { target: { value: "lab/express-api/complete" } })

    expect(props.onFixtureChange).toHaveBeenCalledWith("lab/express-api/complete")
  })

  it("steps to the next fixture, and cannot step back from the first", () => {
    const props = createProps()
    render(<LabToolbar {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    expect(props.onFixtureChange).toHaveBeenCalledWith("lab/express-api/complete")
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous" }).disabled).toBe(true)
  })

  it("steps back to the previous fixture, and cannot step on from the last", () => {
    const props = createProps({ fixtureId: "lab/express-api/complete", previousFixtureId: "playground/demo-fastapi/route", nextFixtureId: null })
    render(<LabToolbar {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "Previous" }))

    expect(props.onFixtureChange).toHaveBeenCalledWith("playground/demo-fastapi/route")
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).disabled).toBe(true)
  })

  it("offers a choice of diagram only when the fixture has several", () => {
    const { unmount } = render(<LabToolbar {...createProps()} />)

    expect(screen.queryByRole("combobox", { name: "Diagram" })).toBeNull()

    unmount()
    const props = createProps({ diagramOptions: [{ value: "segment-1/stock", label: "Stock check" }, { value: "segment-1/checkout", label: "Checkout" }], diagramId: "segment-1/stock" })
    render(<LabToolbar {...props} />)
    fireEvent.change(screen.getByRole("combobox", { name: "Diagram" }), { target: { value: "segment-1/checkout" } })

    expect(props.onDiagramChange).toHaveBeenCalledWith("segment-1/checkout")
  })

  it("shows what the lab is doing", () => {
    render(<LabToolbar {...createProps({ statusMessage: "Loading the fixture." })} />)

    expect(screen.getByRole("status").textContent).toBe("Loading the fixture.")
  })
})
