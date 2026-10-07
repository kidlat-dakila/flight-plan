import { ASTCodeGroupGraph, type LineRange } from "@/ast-graph"
import { generateBlastRadiusDiagram } from "@/blast-radius-diagram"
import { generateCodeWalkthrough, type LinkedCodeWalkthrough } from "@/code-walkthrough"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"

interface GroupFile {
  readonly filePath: string
  readonly lines: readonly string[]
  readonly imports?: Readonly<Record<string, string>>
  readonly diffLines?: readonly LineRange[]
}

const walkthroughOf = (files: readonly GroupFile[], firstWaypointNumber?: number): LinkedCodeWalkthrough => {
  const group = new ASTCodeGroupGraph(
    files.map(({ filePath, lines, imports = {}, diffLines = [] }) => ({
      filePath,
      gitSha: "head-commit",
      source: lines.join("\n"),
      importedBy: [],
      importsTo: Object.values(imports),
      importedFilePaths: new Map(Object.entries(imports)),
      diffLines,
    })),
  )
  const diagramNodes = group.traceAllDiffUsage()
  return generateCodeWalkthrough({
    astGraphFiles: group.astGraphFiles,
    journeyFlowDiagram: generateJourneyFlowDiagram(group.astGraphFiles),
    blastRadiusDiagram: generateBlastRadiusDiagram([...diagramNodes, ...group.traceLooseDeclarationUsage()]),
    ...(firstWaypointNumber === undefined ? {} : { firstWaypointNumber }),
  })
}

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

describe("generateCodeWalkthrough", () => {
  it("makes one waypoint per changed declaration, with the kind of change read from the syntax tree", () => {
    expect(stopsOf(walkthroughOf([changedAt([1, 26])]))).toStrictEqual([
      "w1 src/checkout.ts Lines 1–1 import 1-1",
      "w2 src/checkout.ts Cart type 3-5",
      "w3 src/checkout.ts TAX_RATE variable 7-7",
      "w4 src/checkout.ts subtotal function 9-12",
      "w5 src/checkout.ts Checkout class 14-24",
      "w6 src/checkout.ts Lines 26–26 statement 26-26",
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

  it("links a waypoint to the node of its declaration in each diagram", () => {
    const [waypoint] = walkthroughOf([changedAt([11, 11])]).files[0].waypoints

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
      journeyFlowId: "journey:src/checkout.ts#subtotal",
      journeyNodeId: "src/checkout.ts#subtotal",
      blastNodeId: "src/checkout.ts#subtotal",
    })
  })

  it("links a waypoint of a changed nested function to the journey node of the function that holds it", () => {
    const page: GroupFile = {
      filePath: "src/page.ts",
      lines: ["export function render() {", "  const format = (value) => {", "    return String(value)", "  }", "  return 1", "}"],
      diffLines: [[3, 3]],
    }
    const [waypoint] = walkthroughOf([page]).files[0].waypoints

    expect([waypoint.declaration, waypoint.journeyNodeId, waypoint.blastNodeId]).toStrictEqual(["render", "src/page.ts#render", "src/page.ts#render.format"])
  })

  it("links a changed type to the blast only, a changed import to neither diagram, and a changed statement to the top level node of the journey", () => {
    const links = walkthroughOf([changedAt([1, 1], [4, 4], [26, 26])]).files[0].waypoints.map((waypoint) => [
      waypoint.declaration,
      waypoint.journeyFlowId,
      waypoint.journeyNodeId,
      waypoint.blastNodeId,
    ])

    expect(links).toStrictEqual([
      ["Lines 1–1", "journey:src/checkout.ts#top level", null, null],
      ["Cart", "journey:src/checkout.ts#top level", null, "src/checkout.ts#Cart"],
      ["Lines 26–26", "journey:src/checkout.ts#top level", "src/checkout.ts#top level", null],
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

  it("tells two declarations of one name in a file apart", () => {
    const component: GroupFile = {
      filePath: "src/SaveButton.vue",
      lines: ["<script setup lang=\"ts\">", "const label = \"Save\"", "</script>", "", "<template>", "  <button>{{ label }}</button>", "</template>"],
      diffLines: [[2, 2], [6, 6]],
    }

    expect(stopsOf(walkthroughOf([component]))).toStrictEqual([
      "w1 src/SaveButton.vue default function 1-3",
      "w2 src/SaveButton.vue default (2) function 5-7",
    ])
  })

  it("gives a walkthrough without files when nothing changed", () => {
    expect(walkthroughOf([CHECKOUT])).toStrictEqual({ intro: null, files: [] })
  })
})
