import { buildBlockCard, buildLinesCard, createEmptyJourney, linesCardIdOf, listCardBlocks, readFileGraph, sourceFileOf } from "@/journey-flow-diagram/cards"

const PATH = "src/cart/CartPage.tsx"
const SOURCE = [
  "import { useState } from \"react\"",
  "",
  "const CartLine = ({ name }: { name: string }) => <li>{name}</li>",
  "",
  "export const formatTotal = (total: number) => {",
  "  if (total < 0) return \"0\"",
  "  return total.toFixed(2)",
  "}",
  "",
  "export const CartPage = ({ names }: { names: string[] }) => {",
  "  const [isOpen, setIsOpen] = useState(false)",
  "  return (",
  "    <ul onClick={() => { setIsOpen(!isOpen) }}>",
  "      {names.map((name) => <CartLine key={name} name={name} />)}",
  "    </ul>",
  "  )",
  "}",
  "",
].join("\n")

const readGraph = () => {
  const astGraph = readFileGraph(PATH, SOURCE)
  if (astGraph === null) throw new Error("The file was not read.")
  return astGraph
}

const NO_CARDS: ReadonlySet<string> = new Set()

describe("cards an author adds", () => {
  it("lists the root blocks of a file but its imports, in the order they are written", () => {
    const blocks = listCardBlocks(readGraph())

    expect(blocks.map(({ name, typeLabel, lineStart, lineEnd }) => ({ name, typeLabel, lineStart, lineEnd }))).toStrictEqual([
      { name: "CartLine", typeLabel: "Component", lineStart: 3, lineEnd: 3 },
      { name: "formatTotal", typeLabel: "Function", lineStart: 5, lineEnd: 8 },
      { name: "CartPage", typeLabel: "Component", lineStart: 10, lineEnd: 17 },
    ])
    expect(blocks[blocks.length - 1].childComponentNames).toStrictEqual(["CartLine"])
  })

  it("builds a card of a block with no rows when the author fills it by hand", () => {
    const astGraph = readGraph()
    const [block] = astGraph.rootBlocks.filter((root) => root.name === "formatTotal")
    const card = buildBlockCard(block, { isPrefilled: false, hasChildComponents: false, heldCardIds: NO_CARDS })

    expect(card).toMatchObject({ id: block.id, type: "function", label: null, description: null, rows: [], children: [], triggerLabels: [], blockLabels: [] })
    expect(card.codeBlocks[0]).toBe(block)
  })

  it("prefills the rows of a card from the blocks inside it, in the order they are written", () => {
    const astGraph = readGraph()
    const [block] = astGraph.rootBlocks.filter((root) => root.name === "CartPage")
    const card = buildBlockCard(block, { isPrefilled: true, hasChildComponents: false, heldCardIds: NO_CARDS })
    const rows = card.rows ?? []

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((row) => row.type)).toContain("render-event")
    expect(rows.map((row) => row.lineStart)).toStrictEqual([...rows.map((row) => row.lineStart)].sort((one, two) => one - two))
    expect(rows.every((row) => row.label === null && row.lineStart >= 10 && row.lineEnd <= 17)).toBe(true)
    expect(card.children).toStrictEqual([])
  })

  it("puts the components a component renders inside its card when asked, but those that already have a card", () => {
    const astGraph = readGraph()
    const [page] = astGraph.rootBlocks.filter((root) => root.name === "CartPage")
    const [line] = astGraph.rootBlocks.filter((root) => root.name === "CartLine")

    expect(buildBlockCard(page, { isPrefilled: false, hasChildComponents: true, heldCardIds: NO_CARDS }).children.map((child) => child.id)).toStrictEqual([line.id])
    expect(buildBlockCard(page, { isPrefilled: false, hasChildComponents: true, heldCardIds: new Set([line.id]) }).children).toStrictEqual([])
  })

  it("builds a card of a line range, typed as the block around the lines, with the blocks inside the lines as its rows", () => {
    const astGraph = readGraph()
    const lines = { lineStart: 6, lineEnd: 7 }
    const card = buildLinesCard(astGraph, lines, true)

    expect(card).toMatchObject({ id: linesCardIdOf(PATH, lines), type: "function" })
    expect(card.codeBlocks[0]).toMatchObject({ name: "Lines 6 to 7", isRoot: true })
    expect(card.codeBlocks[0].astGraph).toBe(astGraph)
    expect((card.rows ?? []).every((row) => row.lineStart >= 6 && row.lineEnd <= 7)).toBe(true)
    expect(buildLinesCard(astGraph, lines, false).rows).toStrictEqual([])
  })

  it("makes an empty diagram and a source file of a text", () => {
    expect(createEmptyJourney()).toMatchObject({ journeyNodes: [], journeyNodeEdges: [] })
    expect(sourceFileOf("src/a.ts", "const a = 1\nconst b = 2\n")).toStrictEqual({
      path: "src/a.ts",
      language: "typescript",
      lines: [
        { text: "const a = 1", mark: "context", number: 1 },
        { text: "const b = 2", mark: "context", number: 2 },
      ],
      declarations: {},
      references: [],
    })
  })
})
