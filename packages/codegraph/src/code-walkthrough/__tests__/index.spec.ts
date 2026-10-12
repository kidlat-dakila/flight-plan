import type { LineRange } from "@/ast-graph"
import { buildStoredCodeGroupGraph, linkCodeGroupGraph } from "@/code-blocks"
import type { SourceRange } from "@/code-blocks/types"
import type { LinkedCodeWalkthrough } from "@/code-walkthrough"
import { generateWalkthroughFromBlocks } from "@/code-walkthrough/from-blocks"
import { linkCodeWalkthrough, storeCodeWalkthrough } from "@/code-walkthrough/stored"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"
import type { ASTCodeGroupGraph, JourneyFlowDiagram } from "@flightplan/configurations"

interface GroupFile {
  readonly filePath: string
  readonly lines: readonly string[]
  readonly imports?: Readonly<Record<string, string>>
  readonly diffLines?: readonly LineRange[]
}

const FIRST_COLUMN = 1
const FIRST_WAYPOINT_NUMBER = 1

const diffRangesOf = (lines: readonly string[], diffLines: readonly LineRange[]): SourceRange[] =>
  diffLines.flatMap(([startLine, endLine]) =>
    lines.flatMap((text, index): SourceRange[] => {
      const line = index + 1
      const isChanged = startLine <= line && line <= endLine && text.trim() !== ""
      const firstColumn = text.length - text.trimStart().length + FIRST_COLUMN
      return isChanged ? [{ start: { line, column: firstColumn }, end: { line, column: text.length + FIRST_COLUMN } }] : []
    }))

interface Drawn {
  readonly walkthrough: LinkedCodeWalkthrough
  readonly linkedGroup: ASTCodeGroupGraph
  readonly journeyFlowDiagram: JourneyFlowDiagram | null
}

const drawnOf = (files: readonly GroupFile[], firstWaypointNumber = FIRST_WAYPOINT_NUMBER): Drawn => {
  const sources = files.map(({ filePath, lines, imports = {}, diffLines = [] }) => ({
    filePath,
    source: lines.join("\n"),
    importedBy: files.filter((other) => Object.values(other.imports ?? {}).includes(filePath)).map((other) => other.filePath),
    importedFilePaths: new Map(Object.entries(imports)),
    diffs: diffRangesOf(lines, diffLines).map((range) => ({ type: "modified" as const, range })),
  }))
  const group = buildStoredCodeGroupGraph(sources)
  const linkedGroup = linkCodeGroupGraph(group)
  const journeyFlowDiagram = generateJourneyFlowDiagram({ group: linkedGroup, importGraphGroup: [], scope: null })
  const filePaths = files.filter((file) => (file.diffLines ?? []).length > 0).map((file) => file.filePath)
  return { walkthrough: generateWalkthroughFromBlocks({ group: linkedGroup, filePaths, journeyFlowDiagram, firstWaypointNumber }), linkedGroup, journeyFlowDiagram }
}

const walkthroughOf = (files: readonly GroupFile[], firstWaypointNumber = FIRST_WAYPOINT_NUMBER): LinkedCodeWalkthrough => drawnOf(files, firstWaypointNumber).walkthrough

const stopsOf = (walkthrough: LinkedCodeWalkthrough): string[] =>
  walkthrough.files.flatMap((file) =>
    file.waypoints.map(({ id, declaration, category, range }) => `${id} ${file.path} ${declaration} ${category} ${String(range.lineStart)}-${String(range.lineEnd)}`),
  )

const CHECKOUT: GroupFile = {
  filePath: "src/checkout.ts",
  lines: [
    "import { priceOf } from \"./pricing\"",
    "",
    "export interface Cart {",
    "  items: Item[]",
    "}",
    "",
    "export const TAX_RATE = 0.2",
    "",
    "export function subtotal(cart: Cart) {",
    "  const add = (sum, item) => sum + priceOf(item)",
    "  return cart.items.reduce(add, 0)",
    "}",
    "",
    "export class Checkout {",
    "  total(cart: Cart) {",
    "    return subtotal(cart) * (1 + TAX_RATE)",
    "  }",
    "",
    "  static Receipt = class {",
    "    print() {",
    "      return \"receipt\"",
    "    }",
    "  }",
    "}",
    "",
    "console.info(\"loaded\")",
  ],
  imports: { "./pricing": "src/pricing.ts" },
}

const changedAt = (...diffLines: readonly LineRange[]): GroupFile => ({ ...CHECKOUT, diffLines })

describe("generateWalkthroughFromBlocks", () => {
  it("makes one waypoint per changed declaration, with the kind of change read from the syntax tree", () => {
    expect(stopsOf(walkthroughOf([changedAt([1, 26])]))).toStrictEqual([
      "w1 src/checkout.ts Lines 1–1 import 1-1",
      "w2 src/checkout.ts Cart type 3-5",
      "w3 src/checkout.ts TAX_RATE variable 7-7",
      "w4 src/checkout.ts subtotal function 9-12",
      "w5 src/checkout.ts Checkout class 14-24",
      "w6 src/checkout.ts Checkout.total method 15-17",
      "w7 src/checkout.ts Checkout.Receipt.print method 20-22",
      "w8 src/checkout.ts Lines 26–26 statement 26-26",
    ])
  })

  it("stops at the function a changed line is in, not at a function nested in it", () => {
    expect(stopsOf(walkthroughOf([changedAt([10, 10])]))).toStrictEqual(["w1 src/checkout.ts subtotal function 9-12"])
  })

  it("stops at the method of a class, and at the method of a class nested in a class", () => {
    expect(stopsOf(walkthroughOf([changedAt([16, 16], [21, 21])]))).toStrictEqual([
      "w1 src/checkout.ts Checkout.total method 15-17",
      "w2 src/checkout.ts Checkout.Receipt.print method 20-22",
    ])
  })

  it("makes one waypoint for several changes in one declaration", () => {
    expect(stopsOf(walkthroughOf([changedAt([10, 10], [11, 11])]))).toStrictEqual(["w1 src/checkout.ts subtotal function 9-12"])
  })

  it("shows the whole of a type that changed on one of its lines", () => {
    expect(stopsOf(walkthroughOf([changedAt([4, 4])]))).toStrictEqual(["w1 src/checkout.ts Cart type 3-5"])
  })

  it("links a waypoint to the node of its declaration in the journey", () => {
    const [{ codeBlocks, ...waypoint }] = walkthroughOf([changedAt([11, 11])]).files[0].waypoints

    expect(codeBlocks[0].id).toBe("src/checkout.ts#function@9:1")
    expect(waypoint).toStrictEqual({
      id: "w1",
      title: null,
      declaration: "subtotal",
      reading: "",
      needsAttention: null,
      findings: [],
      children: [],
      range: { lineStart: 9, lineEnd: 12 },
      category: "function",
      journeyNodeId: "src/checkout.ts#function@9:1",
    })
  })

  it("links a waypoint of a changed nested function to the journey node of the function that holds it", () => {
    const page: GroupFile = {
      filePath: "src/page.ts",
      lines: ["export function render() {", "  const format = (value) => {", "    return String(value)", "  }", "  return format(1)", "}"],
      diffLines: [[3, 3]],
    }
    const [waypoint] = walkthroughOf([page]).files[0].waypoints

    expect([waypoint.declaration, waypoint.journeyNodeId]).toStrictEqual(["render", "src/page.ts#function@1:1"])
  })

  it("links a changed type, a changed import and a changed statement at the top level of a file to no node", () => {
    const links = walkthroughOf([changedAt([1, 1], [4, 4], [26, 26])]).files[0].waypoints.map((waypoint) => [
      waypoint.declaration,
      waypoint.journeyNodeId,
    ])

    expect(links).toStrictEqual([
      ["Lines 1–1", null],
      ["Cart", null],
      ["Lines 26–26", null],
    ])
  })

  it("makes one File Section per file with changes, and numbers the waypoints through them", () => {
    const pricing: GroupFile = { filePath: "src/pricing.ts", lines: ["export const priceOf = (item) => item.price"], diffLines: [[1, 1]] }
    const untouched: GroupFile = { filePath: "src/ui.ts", lines: ["export const render = () => 1"] }
    const walkthrough = walkthroughOf([changedAt([7, 7], [10, 10]), pricing, untouched], 5)

    expect(walkthrough.intro).toBeNull()
    expect(walkthrough.files.map(({ path, title, summary }) => ({ path, title, summary }))).toStrictEqual([
      { path: "src/checkout.ts", title: "src/checkout.ts", summary: [] },
      { path: "src/pricing.ts", title: "src/pricing.ts", summary: [] },
    ])
    expect(stopsOf(walkthrough)).toStrictEqual([
      "w5 src/checkout.ts TAX_RATE variable 7-7",
      "w6 src/checkout.ts subtotal function 9-12",
      "w7 src/pricing.ts priceOf function 1-1",
    ])
  })

  it("makes one waypoint of a Vue component, whichever of its script and its template changed", () => {
    const component: GroupFile = {
      filePath: "src/SaveButton.vue",
      lines: ["<script setup lang=\"ts\">", "const label = \"Save\"", "</script>", "", "<template>", "  <button>{{ label }}</button>", "</template>"],
      diffLines: [[2, 2], [6, 6]],
    }

    expect(stopsOf(walkthroughOf([component]))).toStrictEqual(["w1 src/SaveButton.vue SaveButton function 1-7"])
  })

  it("gives a walkthrough without files when nothing changed", () => {
    expect(walkthroughOf([CHECKOUT])).toStrictEqual({ intro: null, files: [] })
  })
})

describe("the code blocks of a waypoint", () => {
  const changed = [{ ...CHECKOUT, diffLines: [[10, 10]] as const }]

  it("holds the block the waypoint stops at first, then the changed blocks inside it in the order they are written", () => {
    const [waypoint] = drawnOf(changed).walkthrough.files[0].waypoints

    expect(waypoint.declaration).toBe("subtotal")
    expect(waypoint.codeBlocks[0].id).toBe("src/checkout.ts#function@9:1")
    expect(waypoint.codeBlocks.length).toBeGreaterThan(1)
    expect(waypoint.codeBlocks.slice(1).every((block) => block.lineOfCodeDiffs !== null && block.lineOfCodeRangeReference[0].start.line === 10)).toBe(true)
    expect(new Set(waypoint.codeBlocks.map((block) => block.id)).size).toBe(waypoint.codeBlocks.length)
  })

  it("holds each block as the block of the linked group, the one a journey node holds", () => {
    const { walkthrough, linkedGroup, journeyFlowDiagram } = drawnOf(changed)
    const [waypoint] = walkthrough.files[0].waypoints
    const node = journeyFlowDiagram?.journeyNodes.find((one) => one.id === waypoint.journeyNodeId)

    expect(waypoint.codeBlocks.every((block) => linkedGroup.codeBlocks.includes(block))).toBe(true)
    expect(node?.codeBlocks[0] === waypoint.codeBlocks[0]).toBe(true)
  })

  it("holds the block that changed alone when the waypoint stops at it", () => {
    const [waypoint] = drawnOf([{ ...CHECKOUT, diffLines: [[7, 7]] as const }]).walkthrough.files[0].waypoints

    expect(waypoint.codeBlocks.map((block) => block.name)).toStrictEqual(["TAX_RATE"])
  })

  it("is stored as the ids of its blocks, and linked back to the same blocks", () => {
    const { walkthrough, linkedGroup } = drawnOf(changed)
    const stored = storeCodeWalkthrough(walkthrough)
    const [storedWaypoint] = stored.files[0].waypoints
    const blockById = new Map(linkedGroup.codeBlocks.map((block) => [block.id, block] as const))

    expect(storedWaypoint.codeBlockIds).toStrictEqual(walkthrough.files[0].waypoints[0].codeBlocks.map((block) => block.id))
    expect(Object.keys(storedWaypoint)).not.toContain("codeBlocks")
    expect(() => JSON.stringify(stored)).not.toThrow()
    const linked = linkCodeWalkthrough(stored, blockById)
    const [original] = walkthrough.files[0].waypoints

    expect(linked.files[0].waypoints[0].codeBlocks.every((block, index) => block === original.codeBlocks[index])).toBe(true)
    expect(storeCodeWalkthrough(linked)).toStrictEqual(stored)
  })
})

const USERS: GroupFile = { filePath: "src/users.ts", lines: ["export const getUsers = () => [{ id: 1, name: \"a\" }]", "export const saveUser = (user) => user"] }
const RENAME: GroupFile = {
  filePath: "src/rename.ts",
  lines: [
    "import { getUsers, saveUser } from \"./users\"",
    "export const renameUser = (param) => {",
    "  const users = getUsers()",
    "  if (!users) throw new Error(\"no user\")",
    "  const user = users.filter((u) => u.id === param.id)",
    "  user.name = param.name",
    "  const stored = { id: user.id, meta: { name: user.name } }",
    "  for (const one of users) { saveUser(one) }",
    "  try {",
    "    saveUser(user)",
    "  } catch (err) {",
    "    throw err",
    "  }",
    "  return users.map((u) => { if (u.id) { return { ...u, n: 1 } } return u })",
    "}",
  ],
  imports: { "./users": "src/users.ts" },
}
const SUM: GroupFile = {
  filePath: "src/sum.ts",
  lines: ["export const sum = () => {", "  const one = 1", "  const two = 2", "  const three = 3", "  const four = 4", "  return one + two + three + four", "}"],
}
const CART: GroupFile = {
  filePath: "src/cart.tsx",
  lines: [
    "export const Cart = ({ items, onSave }) => {",
    "  const total = items.length",
    "  return (",
    "    <section className=\"cart\">",
    "      <h1>Cart</h1>",
    "      {total > 0 && <p>{total}</p>}",
    "      {items.map((item) => <li key={item}>{item}</li>)}",
    "      <button onClick={() => onSave(total)}>Save</button>",
    "    </section>",
    "  )",
    "}",
  ],
}

const childrenOf = (file: GroupFile, diffLines: readonly LineRange[], others: readonly GroupFile[] = []): string[] => {
  const [section] = walkthroughOf([{ ...file, diffLines }, ...others]).files
  return section.waypoints.flatMap((waypoint) =>
    waypoint.children.map(({ id, declaration, category, range, children }) => `${id} ${declaration} ${category} ${String(range.lineStart)}-${String(range.lineEnd)} ${String(children.length)}`),
  )
}

describe("the steps of a waypoint", () => {
  it("reads a changed declaration in parts: a child per changed step, with the statements that follow each other as one", () => {
    expect(childrenOf(RENAME, [[3, 14]], [USERS])).toStrictEqual([
      "w1.1 renameUser › users statement 3-3 0",
      "w1.2 renameUser › Condition :4 statement 4-4 0",
      "w1.3 renameUser › user, stored statement 5-7 0",
      "w1.4 renameUser › Loop :8 statement 8-8 0",
      "w1.5 renameUser › Try :9 statement 9-13 2",
      "w1.6 renameUser › Function :14 statement 14-14 0",
    ])
  })

  it("has no child for a declaration with one changed step", () => {
    expect(childrenOf(CHECKOUT, [[10, 10]])).toStrictEqual([])
    expect(childrenOf(SUM, [[2, 3]])).toStrictEqual([])
  })

  it("ends a step at a line that did not change", () => {
    expect(childrenOf(SUM, [[2, 3], [5, 5]])).toStrictEqual(["w1.1 sum › one, two statement 2-3 0", "w1.2 sum › four statement 5-5 0"])
  })

  it("holds in a child the blocks of its statements and the changed blocks folded into them", () => {
    const [waypoint] = walkthroughOf([{ ...RENAME, diffLines: [[3, 14]] }, USERS]).files[0].waypoints
    const blocks = waypoint.children[2].codeBlocks

    expect(blocks.slice(0, 1).map((block) => block.id)).toStrictEqual(["src/rename.ts#variable@5:3"])
    expect(blocks.map((block) => block.id)).toContain("src/rename.ts#variable@7:3")
    expect(blocks.length).toBeGreaterThan(2)
    expect(blocks.every((block) => block.lineOfCodeRangeReference[0].start.line >= 5 && block.lineOfCodeRangeReference[0].end.line <= 7)).toBe(true)
    expect(blocks.every((block) => waypoint.codeBlocks.includes(block))).toBe(true)
  })

  it("gives changed markup no child, but an expression inside it", () => {
    expect(childrenOf(CART, [[5, 5]])).toStrictEqual([])
    expect(childrenOf(CART, [[4, 4], [7, 7]])).toStrictEqual([])
    expect(childrenOf(CART, [[2, 2], [6, 6], [8, 8]])).toStrictEqual([
      "w1.1 Cart › total statement 2-2 0",
      "w1.2 Cart › Markup condition :6 statement 6-6 0",
      "w1.3 Cart › button.onClick statement 8-8 0",
    ])
  })
})
