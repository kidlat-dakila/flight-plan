import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import BlastBand, { type BlastView } from "@/components/BlastBand"
import { TooltipProvider } from "@/components/blocks/tooltip"

type BlastBandProps = ComponentProps<typeof BlastBand>

const fileNode = (path: string, label: string): BlastView["board"]["nodes"][number] => ({
  id: path,
  x: 120,
  y: 80,
  radius: 6,
  mark: "plain",
  markLabel: "Used by the change",
  label,
  path,
  impactReason: null,
  impactNote: null,
  isUnassessed: false,
  assessment: null,
  importers: { heading: "Imported by 0 files", emptyLabel: "None.", files: [] },
  imports: { heading: "Imports 0 files", emptyLabel: "None.", files: [] },
  fileLink: null,
})

const EXPORT_BOUND: BlastView = {
  id: "export-bound",
  label: "Export bound",
  description: "Export bound: the files that use what the change changed",
  summary: ["3 files", "1 changed", "2 imports"],
  legend: [{ mark: "modified", label: "Modified file" }, { mark: "plain", label: "File the change did not touch" }],
  edgeLegendLabel: "An arrow points at the file that is imported",
  board: { width: 400, height: 200, nodes: [fileNode("src/cart.ts", "cart.ts")], edges: [] },
}

const IMPORT_BOUND: BlastView = {
  id: "import-bound",
  label: "Import bound",
  description: "Import bound: the files the change uses",
  summary: ["2 files", "1 changed", "1 import"],
  legend: [{ mark: "plain", label: "File the change uses" }],
  edgeLegendLabel: "An arrow points at the file that is imported",
  board: { width: 400, height: 200, nodes: [fileNode("src/rates.ts", "rates.ts")], edges: [] },
}

const createProps = (overrides: Partial<BlastBandProps> = {}): BlastBandProps => ({
  anchorId: "blast",
  heading: "Blast Diagram",
  viewsLabel: "View of the Blast Diagram",
  defaultViewId: "export-bound",
  assessmentForm: { editLabel: "Edit impact", impactTypeLabel: "Impact", impactReasonLabel: "Reason", choices: [] },
  views: [EXPORT_BOUND, IMPORT_BOUND],
  codeLinks: {},
  renderImpactEditor: null,
  onOpenCodeLink: vi.fn(),
  onOpenFile: vi.fn(),
  ...overrides,
})

const renderBand = (overrides: Partial<BlastBandProps> = {}): void => {
  render(<TooltipProvider><BlastBand {...createProps(overrides)} /></TooltipProvider>)
}

describe("BlastBand", () => {
  it("shows its heading, the counts of its board and the key to its marks", () => {
    renderBand()

    expect(screen.getByRole("heading", { level: 2, name: "Blast Diagram" })).toBeTruthy()
    expect(screen.getByText("3 files")).toBeTruthy()
    expect(screen.getByText("1 changed")).toBeTruthy()
    expect(screen.getByText("2 imports")).toBeTruthy()
    expect(screen.getByText("Modified file")).toBeTruthy()
    expect(screen.getByText("File the change did not touch")).toBeTruthy()
    expect(screen.getByText("An arrow points at the file that is imported")).toBeTruthy()
  })

  it("opens on the default view, and switches the board, the counts and the key from the toolbar of the diagram", () => {
    renderBand()
    const views = screen.getByRole("group", { name: "View of the Blast Diagram" })

    expect(within(views).getByRole("button", { name: "Export bound" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "cart.ts" })).toBeTruthy()

    fireEvent.click(within(views).getByRole("button", { name: "Import bound" }))

    expect(within(screen.getByRole("group", { name: "View of the Blast Diagram" })).getByRole("button", { name: "Import bound" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "rates.ts" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "cart.ts" })).toBeNull()
    expect(screen.getByText("File the change uses")).toBeTruthy()
    expect(screen.getByText("1 import")).toBeTruthy()
  })

  it("opens on the import bound when that is the default view", () => {
    renderBand({ defaultViewId: "import-bound" })

    expect(screen.getByRole("button", { name: "rates.ts" })).toBeTruthy()
  })

  it("offers no switch when the diagram has one view", () => {
    renderBand({ views: [EXPORT_BOUND] })

    expect(screen.queryByRole("group", { name: "View of the Blast Diagram" })).toBeNull()
    expect(screen.getByRole("button", { name: "cart.ts" })).toBeTruthy()
  })
})
