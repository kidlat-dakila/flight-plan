import { render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import JourneyBand from "@/components/JourneyBand"

type JourneyBandProps = ComponentProps<typeof JourneyBand>

const createProps = (overrides: Partial<JourneyBandProps> = {}): JourneyBandProps => ({
  anchorId: "journey",
  heading: "Journey Flow Diagram",
  diagram: {
    anchorId: "journey-price",
    title: "A shopper sees a price",
    summaryLabel: "2 nodes",
    width: 400,
    height: 200,
    nodes: [],
    uiCards: [],
    edges: [],
  },
  codeLinks: {},
  onOpenCodeLink: vi.fn(),
  ...overrides,
})

describe("JourneyBand", () => {
  it("shows its heading, the title of the diagram and its summary", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "A shopper sees a price" })).toBeTruthy()
    expect(screen.getByText("2 nodes")).toBeTruthy()
  })

  it("shows only its heading when the journey is absent", () => {
    render(<JourneyBand {...createProps({ diagram: null })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })
})
