import { fireEvent, render, screen, within } from "@testing-library/react"
import BlastDiagram, { type BlastAuthoring, type BlastBoard, type BlastNode } from "@/components/BlastDiagram"
import { findNavigatorButton, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { paragraph } from "@/lib/__tests__/review-samples"
import { navigatorButtonOf } from "@/lib/navigator-controls"

const fileList = (heading: string, paths: readonly string[]): BlastNode["imports"] => ({
  heading,
  emptyLabel: "None in this segment.",
  files: paths.map((path) => ({ id: path, label: path })),
})

const node = (overrides: Partial<BlastNode> & Pick<BlastNode, "id" | "label">): BlastNode => ({
  x: 120,
  y: 80,
  radius: 6,
  mark: "plain",
  markLabel: "Not assessed",
  path: overrides.id,
  impactReason: null,
  impactNote: "Nobody has assessed what the change does to this file.",
  isUnassessed: true,
  isBeingWritten: false,
  assessment: { impactType: "unassessed", impactReason: "" },
  importers: fileList("Imported by 0 files", []),
  imports: fileList("Imports 0 files", []),
  fileLink: null,
  ...overrides,
})

const BOARD: BlastBoard = {
  width: 700,
  height: 300,
  nodes: [
    node({
      id: "src/price.ts",
      label: "price.ts",
      mark: "modified",
      markLabel: "Modified",
      impactNote: null,
      assessment: null,
      importers: fileList("Imported by 1 file", ["src/cart.ts"]),
      fileLink: { anchorId: "file-1", label: "Read it in the Code Walkthrough" },
    }),
    node({
      id: "src/cart.ts",
      label: "cart.ts",
      x: 320,
      mark: "breaks",
      markLabel: "Breaks",
      impactNote: null,
      impactReason: paragraph("It assumes the price is never negative."),
      assessment: { impactType: "breaks", impactReason: "It assumes the price is never negative." },
      imports: fileList("Imports 1 file", ["src/price.ts"]),
    }),
    node({ id: "src/logger.ts", label: "logger.ts", x: 520 }),
  ],
  edges: [{ id: "src/cart.ts>src/price.ts", importerId: "src/cart.ts", importedId: "src/price.ts", points: [{ x: 310, y: 80 }, { x: 132, y: 80 }] }],
}

const AUTHORING: BlastAuthoring = {
  editLabel: "Edit impact",
  renderImpactEditor: (edited, onClose) => (
    <button type="button" onClick={onClose}>{`Stop editing ${edited.path}`}</button>
  ),
}

const renderDiagram = (onOpenFile = vi.fn(), authoring: BlastAuthoring | null = null): HTMLElement => {
  render(<BlastDiagram title="Blast Diagram" board={BOARD} codeLinks={{}} authoring={authoring} onOpenCodeLink={vi.fn()} onOpenFile={onOpenFile} />)
  return screen.getByRole("group", { name: "Blast Diagram" })
}

describe("BlastDiagram", () => {
  it("draws each file as a mark with its label, and says what the change did to a changed or an assessed one", () => {
    const board = renderDiagram()

    expect(within(board).getByRole("button", { name: /price\.ts.*Modified/ }).getAttribute("data-mark")).toBe("modified")
    expect(within(board).getByRole("button", { name: /cart\.ts.*Breaks/ }).getAttribute("data-mark")).toBe("breaks")
    expect(within(board).getByRole("button", { name: "logger.ts" }).getAttribute("data-mark")).toBe("plain")
    expect(within(board).queryByText("Not assessed")).toBeNull()
  })

  it("draws one line for each import", () => {
    const board = renderDiagram()

    expect(board.querySelectorAll("svg path[data-standing]")).toHaveLength(1)
  })

  it("keeps a hovered file and the files joined to it, and fades the rest", () => {
    const board = renderDiagram()

    fireEvent.pointerEnter(within(board).getByRole("button", { name: /price\.ts/ }))

    expect(within(board).getByRole("button", { name: /price\.ts/ }).getAttribute("data-standing")).toBe("focal")
    expect(within(board).getByRole("button", { name: /cart\.ts/ }).getAttribute("data-standing")).toBe("near")
    expect(within(board).getByRole("button", { name: "logger.ts" }).getAttribute("data-standing")).toBe("far")
    expect(board.querySelector("svg path[data-standing]")?.getAttribute("data-standing")).toBe("near")

    fireEvent.pointerLeave(within(board).getByRole("button", { name: /price\.ts/ }))

    expect(within(board).getByRole("button", { name: "logger.ts" }).getAttribute("data-standing")).toBe("plain")
  })

  it("lists what imports a file and what it imports in the side panel when the file is pressed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /price\.ts/ }))

    const panel = await screen.findByRole("region", { name: "src/price.ts" })

    expect(within(panel).getByText("Modified")).toBeTruthy()
    expect(within(panel).getByText("Imported by 1 file")).toBeTruthy()
    expect(within(panel).getByRole("button", { name: "src/cart.ts" })).toBeTruthy()
    expect(within(panel).getByText("None in this segment.")).toBeTruthy()
  })

  it("shows why a file has its impact in the side panel", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /cart\.ts/ }))

    const panel = await screen.findByRole("region", { name: "src/cart.ts" })

    expect(within(panel).getByText("Breaks")).toBeTruthy()
    expect(within(panel).getByText("It assumes the price is never negative.")).toBeTruthy()
  })

  it("says in the side panel, and not on the board, that a file is not assessed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: "logger.ts" }))

    const panel = await screen.findByRole("region", { name: "src/logger.ts" })

    expect(within(panel).getByText("Not assessed")).toBeTruthy()
    expect(within(panel).getByText("Nobody has assessed what the change does to this file.")).toBeTruthy()
  })

  it("asks for the write-up of a file nobody assessed, with the button and with G, and never for a file of the change", async () => {
    const onWriteUpFile = vi.fn()
    renderInNavigator(
      <BlastDiagram
        title="Blast Diagram"
        board={BOARD}
        codeLinks={{}}
        authoring={null}
        navigation={{ anchorId: SECTION_ANCHOR_ID, groups: [] }}
        onWriteUpFile={onWriteUpFile}
        onOpenCodeLink={vi.fn()}
        onOpenFile={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "logger.ts" }))
    const panel = await screen.findByRole("region", { name: "src/logger.ts" })

    expect(within(panel).getByText("Not assessed yet.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: /Assess this file/ }))
    await findNavigatorButton("Assess this file")
    fireEvent.keyDown(document.body, { key: "g" })

    expect(onWriteUpFile.mock.calls).toStrictEqual([["src/logger.ts"], ["src/logger.ts"]])

    fireEvent.click(screen.getByRole("button", { name: /price\.ts/ }))
    const changed = await screen.findByRole("region", { name: "src/price.ts" })

    expect(within(changed).queryByRole("button", { name: /Assess this file/ })).toBeNull()
  })

  it("puts the write-up of a file in the group of the views the navigator is handed", async () => {
    renderInNavigator(
      <BlastDiagram
        title="Blast Diagram"
        board={BOARD}
        codeLinks={{}}
        authoring={null}
        navigation={{ anchorId: SECTION_ANCHOR_ID, groups: [[navigatorButtonOf({ key: "e", label: "Export bound", onRun: vi.fn() })]] }}
        onWriteUpFile={vi.fn()}
        onOpenCodeLink={vi.fn()}
        onOpenFile={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "logger.ts" }))
    const writeUp = await findNavigatorButton("Assess this file")

    expect((await findNavigatorButton("Export bound")).closest("div")).toBe(writeUp.closest("div"))
  })

  it("draws skeleton lines while the agent assesses the file, and offers no write-up then", async () => {
    const board = { ...BOARD, nodes: BOARD.nodes.map((candidate) => (candidate.id === "src/logger.ts" ? { ...candidate, isBeingWritten: true } : candidate)) }
    render(<BlastDiagram title="Blast Diagram" board={board} codeLinks={{}} authoring={null} onWriteUpFile={vi.fn()} onOpenCodeLink={vi.fn()} onOpenFile={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "logger.ts" }))
    const panel = await screen.findByRole("region", { name: "src/logger.ts" })

    expect(within(panel).getByText("The agent is assessing this file.")).toBeTruthy()
    expect(panel.querySelector("[data-unwritten]")).not.toBeNull()
    expect(within(panel).queryByRole("button", { name: /Assess this file/ })).toBeNull()
  })

  it("moves the side panel to a file picked from a list", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /price\.ts/ }))
    fireEvent.click(within(await screen.findByRole("region", { name: "src/price.ts" })).getByRole("button", { name: "src/cart.ts" }))

    expect(await screen.findByRole("region", { name: "src/cart.ts" })).toBeTruthy()
  })

  it("opens the file's File Section from the side panel", async () => {
    const onOpenFile = vi.fn()
    renderDiagram(onOpenFile)

    fireEvent.click(screen.getByRole("button", { name: /price\.ts/ }))
    fireEvent.click(within(await screen.findByRole("region", { name: "src/price.ts" })).getByRole("button", { name: "Read it in the Code Walkthrough" }))

    expect(onOpenFile).toHaveBeenCalledWith("file-1")
  })

  it("offers no editing of an impact to a reviewer", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /cart\.ts/ }))

    expect(within(await screen.findByRole("region", { name: "src/cart.ts" })).queryByRole("button", { name: "Edit impact" })).toBeNull()
  })

  it("lets an author edit the impact of a file the change did not touch, in place of what the panel says about it", async () => {
    renderDiagram(vi.fn(), AUTHORING)

    fireEvent.click(screen.getByRole("button", { name: /cart\.ts/ }))
    const panel = await screen.findByRole("region", { name: "src/cart.ts" })
    fireEvent.click(within(panel).getByRole("button", { name: "Edit impact" }))

    expect(within(panel).queryByText("It assumes the price is never negative.")).toBeNull()
    expect(within(panel).queryByRole("button", { name: "Edit impact" })).toBeNull()

    fireEvent.click(within(panel).getByRole("button", { name: "Stop editing src/cart.ts" }))

    expect(within(panel).getByText("It assumes the price is never negative.")).toBeTruthy()
    expect(within(panel).getByRole("button", { name: "Edit impact" })).toBeTruthy()
  })

  it("offers an author no editing of a file of the change", async () => {
    renderDiagram(vi.fn(), AUTHORING)

    fireEvent.click(screen.getByRole("button", { name: /price\.ts/ }))

    expect(within(await screen.findByRole("region", { name: "src/price.ts" })).queryByRole("button", { name: "Edit impact" })).toBeNull()
  })

  it("marks each file and the side panel of a pressed one with the path of the file", async () => {
    renderDiagram()
    const file = screen.getByRole("button", { name: /price\.ts/ })

    expect(file.dataset).toMatchObject({ artifactPart: "blast-node", artifactId: "src/price.ts" })

    fireEvent.click(file)

    expect((await screen.findByRole("region", { name: "src/price.ts" })).dataset).toMatchObject({ artifactPart: "blast-node", artifactId: "src/price.ts" })
  })
})
