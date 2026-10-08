import { render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import BlastBand from "@/components/BlastBand"

type BlastBandProps = ComponentProps<typeof BlastBand>

const createProps = (overrides: Partial<BlastBandProps> = {}): BlastBandProps => ({
  anchorId: "blast",
  heading: "Blast Diagram",
  summary: [{ verdict: "changed", label: "1 changed" }],
  summaryLabel: "3 of 3 nodes",
  board: { width: 400, height: 200, zones: [], files: [], nodes: [], edges: [] },
  codeLinks: {},
  onOpenCodeLink: vi.fn(),
  ...overrides,
})

describe("BlastBand", () => {
  it("shows its heading and the summary of its board", () => {
    render(<BlastBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Blast Diagram" })).toBeTruthy()
    expect(screen.getByText("1 changed")).toBeTruthy()
    expect(screen.getByText("3 of 3 nodes")).toBeTruthy()
  })
})
