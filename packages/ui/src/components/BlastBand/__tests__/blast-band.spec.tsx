import { render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import BlastBand from "@/components/BlastBand"
import { paragraph } from "@/lib/__tests__/review-samples"

type BlastBandProps = ComponentProps<typeof BlastBand>

const createProps = (overrides: Partial<BlastBandProps> = {}): BlastBandProps => ({
  anchorId: "blast",
  heading: "Blast Diagram",
  absence: null,
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

  it("says why there is no board, and shows no summary, when the blast is absent", () => {
    render(<BlastBand {...createProps({ absence: paragraph("Nothing uses the change."), board: null })} />)

    expect(screen.getByText("Nothing uses the change.")).toBeTruthy()
    expect(screen.queryByText("3 of 3 nodes")).toBeNull()
  })
})
