import { fireEvent, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import BlastBand, { type BlastView } from "@/components/BlastBand"
import { TooltipProvider } from "@/components/blocks/tooltip"
import { findNavigatorButton, navigatorLabels, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"

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
  anchorId: SECTION_ANCHOR_ID,
  heading: "Blast Diagram",
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
  renderInNavigator(<TooltipProvider><BlastBand {...createProps(overrides)} /></TooltipProvider>)
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

  it("opens on the default view, and switches the board, the counts and the key from the navigator", async () => {
    renderBand()

    expect((await findNavigatorButton("Export bound")).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "cart.ts" })).toBeTruthy()

    fireEvent.click(await findNavigatorButton("Import bound"))

    expect((await findNavigatorButton("Import bound")).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "rates.ts" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "cart.ts" })).toBeNull()
    expect(screen.getByText("File the change uses")).toBeTruthy()
    expect(screen.getByText("1 import")).toBeTruthy()
  })

  it("opens on the import bound when that is the default view", () => {
    renderBand({ defaultViewId: "import-bound" })

    expect(screen.getByRole("button", { name: "rates.ts" })).toBeTruthy()
  })

  it("switches the view with E and Q", async () => {
    renderBand()
    await findNavigatorButton("Export bound")

    fireEvent.keyDown(document.body, { key: "q" })

    expect(await screen.findByRole("button", { name: "rates.ts" })).toBeTruthy()

    fireEvent.keyDown(document.body, { key: "e" })

    expect(await screen.findByRole("button", { name: "cart.ts" })).toBeTruthy()
  })

  it("offers no switch when the diagram has one view", async () => {
    renderBand({ views: [EXPORT_BOUND] })

    expect(await navigatorLabels("Zoom in")).toStrictEqual(["Jump to", "Zoom in", "Zoom out", "Full screen", "Reset view"])
    expect(screen.getByRole("button", { name: "cart.ts" })).toBeTruthy()
  })
})
