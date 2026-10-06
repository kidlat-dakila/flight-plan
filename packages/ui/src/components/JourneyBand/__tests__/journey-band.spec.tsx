import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import JourneyBand from "@/components/JourneyBand"
import { paragraph } from "@/lib/__tests__/review-samples"

type JourneyBandProps = ComponentProps<typeof JourneyBand>

const createProps = (overrides: Partial<JourneyBandProps> = {}): JourneyBandProps => ({
  anchorId: "journey",
  heading: "Journey Flow Diagram",
  absence: null,
  configuration: {
    label: "Journey Flow Diagram configuration",
    levels: null,
    toggles: [{ key: "data", label: "Data", countLabel: "2", isOn: false }],
  },
  legend: [{ kind: "call", label: "Call" }],
  diagram: {
    anchorId: "journey-price",
    title: "A shopper sees a price",
    summaryLabel: "2 nodes",
    width: 400,
    height: 200,
    nodes: [],
    edges: [],
  },
  codeLinks: {},
  onOpenCodeLink: vi.fn(),
  onLevelsChange: vi.fn(),
  onToggle: vi.fn(),
  ...overrides,
})

describe("JourneyBand", () => {
  it("shows its heading, the title of the diagram and its summary", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "A shopper sees a price" })).toBeTruthy()
    expect(screen.getByText("2 nodes")).toBeTruthy()
  })

  it("says why there is no diagram, and shows no configuration, when the journey is absent", () => {
    render(<JourneyBand {...createProps({ absence: paragraph("The change touches no function."), configuration: null, diagram: null })} />)

    expect(screen.getByText("The change touches no function.")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("reports a toggle that is switched", () => {
    const onToggle = vi.fn()
    render(<JourneyBand {...createProps({ onToggle })} />)

    fireEvent.click(screen.getByRole("checkbox", { name: /Data/ }))

    expect(onToggle).toHaveBeenCalledWith("data", true)
  })
})
