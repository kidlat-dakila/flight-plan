import { render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import BlastBand from "@/components/BlastBand"

type BlastBandProps = ComponentProps<typeof BlastBand>

const createProps = (overrides: Partial<BlastBandProps> = {}): BlastBandProps => ({
  anchorId: "blast",
  heading: "Blast Diagram",
  summary: ["3 files", "1 changed", "2 imports"],
  legend: [{ mark: "modified", label: "Modified file" }, { mark: "plain", label: "File the change did not touch" }],
  edgeLegendLabel: "An arrow points at the file that is imported",
  board: { width: 400, height: 200, nodes: [], edges: [] },
  codeLinks: {},
  onOpenCodeLink: vi.fn(),
  onOpenFile: vi.fn(),
  ...overrides,
})

describe("BlastBand", () => {
  it("shows its heading, the counts of its board and the key to its marks", () => {
    render(<BlastBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Blast Diagram" })).toBeTruthy()
    expect(screen.getByText("3 files")).toBeTruthy()
    expect(screen.getByText("1 changed")).toBeTruthy()
    expect(screen.getByText("2 imports")).toBeTruthy()
    expect(screen.getByText("Modified file")).toBeTruthy()
    expect(screen.getByText("File the change did not touch")).toBeTruthy()
    expect(screen.getByText("An arrow points at the file that is imported")).toBeTruthy()
  })
})
