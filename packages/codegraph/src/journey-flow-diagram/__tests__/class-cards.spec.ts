import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { nameOfBlock } from "@/journey/names"
import { listJourneyNodes } from "@/journey-flow-diagram"
import type { JourneyNode } from "@flightplan/configurations"
import { diagramOf, outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const PRICING = codeOf("export const priceOf = (item) => {", "  return item.price", "}")
const PRICING_CHANGE = { "src/pricing.ts": [rangeAt(2, 3, 2, 20)] }

const STORE = codeOf(
  "import { priceOf } from \"./pricing\"",
  "export class Store {",
  "  items = []",
  "  add(item) {",
  "    this.items.push(item)",
  "  }",
  "  total() {",
  "    return priceOf(this.items[0])",
  "  }",
  "}",
)

const rowNamesOf = (node: JourneyNode | undefined): string[] => (node?.blockLabels ?? []).map(({ codeBlock }) => nameOfBlock(codeBlock))

const nodeNamed = (nodes: readonly JourneyNode[], name: string): JourneyNode | undefined => listJourneyNodes(nodes).find((node) => node.codeBlocks[0].name === name)

describe("the card of a class", () => {
  it("makes a node of each method on a chain, drawn inside the node of its class", () => {
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/store.ts": STORE }, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["class Store", "  method Store.total", "function priceOf (changed)"])
    expect(diagram?.journeyNodeEdges.map((edge) => edge.id)).toContain("src/store.ts#method@7:3 -> src/pricing.ts#function@1:1")
  })

  it("lists a property of the class as a row of the class, and no method as a row", () => {
    const diagram = presentDiagramOf({ "src/store.ts": STORE }, { "src/store.ts": [rangeAt(3, 3, 3, 13)] })

    expect(rowNamesOf(nodeNamed(diagram.journeyNodes, "Store"))).toStrictEqual(["Store.items"])
  })

  it("gives a method no row for what it reaches through this", () => {
    const store = codeOf("export class Store {", "  items = []", "  add(item) {", "    this.items.push(item)", "    log(item)", "  }", "}")
    const diagram = presentDiagramOf({ "src/store.ts": store }, { "src/store.ts": [rangeAt(4, 5, 5, 14)] })
    const add = nodeNamed(diagram.journeyNodes, "Store.add")

    expect(add?.diffCodeBlocks.map((block) => block.name)).toContain("this.items.push")
    expect(rowNamesOf(add)).toStrictEqual(["log"])
  })

  it("nests a class that extends another inside it, and leaves out a method the class extending it writes again", () => {
    const cart = codeOf(
      "import { priceOf } from \"./pricing\"",
      "import { Store } from \"./store\"",
      "export class CartStore extends Store {",
      "  total() {",
      "    return priceOf(this.items[0]) * 2",
      "  }",
      "}",
    )
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/store.ts": STORE, "src/cart.ts": cart }, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["class Store", "  class CartStore", "    method CartStore.total", "function priceOf (changed)"])
  })

  it("gives a class with no method no node, and lists it as a step of the node that reads it", () => {
    const files = {
      "src/point.ts": codeOf("export class Point {", "  x = 0", "}"),
      "src/origin.ts": codeOf("import { Point } from \"./point\"", "export const originOf = () => {", "  return new Point()", "}"),
    }
    const diagram = diagramOf(files, { "src/point.ts": [rangeAt(2, 3, 2, 8)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function originOf (changed)"])
  })
})

describe("the card of a class component", () => {
  it("draws a React class component as a component card, with no method card inside it and its events as cards of their own", () => {
    const modal = codeOf(
      "import React from \"react\"",
      "export class Modal extends React.Component {",
      "  close() {",
      "    track(\"close\")",
      "  }",
      "  render() {",
      "    return <div onClick={() => this.close()} />",
      "  }",
      "}",
    )
    const diagram = presentDiagramOf({ "src/modal.tsx": modal }, { "src/modal.tsx": [rangeAt(4, 5, 4, 19)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["component Modal (changed)", "render-event onClick"])
  })
})

const PYTHON_PRICING = codeOf("def price_of(item):", "    return item.price")
const PYTHON_PRICING_CHANGE = { "shop/pricing.py": [rangeAt(2, 5, 2, 22)] }

const PYTHON_STORE = codeOf(
  "from shop.pricing import price_of",
  "class Store:",
  "    rate = 2",
  "    def __init__(self, owner):",
  "        self.items = []",
  "        self.owner = owner",
  "    def add(self, item):",
  "        self.items.append(item)",
  "        log(item)",
  "    def total(self):",
  "        return price_of(self.items[0])",
)

describe("the card of a Python class", () => {
  it("lists a property declared in __init__ as a row of the class, and draws no card for an __init__ that only declares it", () => {
    const diagram = presentDiagramOf({ "shop/store.py": PYTHON_STORE }, { "shop/store.py": [rangeAt(5, 9, 5, 24)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["class Store (changed)"])
    expect(rowNamesOf(nodeNamed(diagram.journeyNodes, "Store"))).toStrictEqual(["Store.items"])
  })

  it("gives a method no row for what it reaches through self", () => {
    const diagram = presentDiagramOf({ "shop/store.py": PYTHON_STORE }, { "shop/store.py": [rangeAt(8, 9, 9, 18)] })

    expect(rowNamesOf(nodeNamed(diagram.journeyNodes, "Store.add"))).toStrictEqual(["log"])
  })

  it("nests a class that extends another from another file, and leaves out a method the class extending it writes again", () => {
    const cart = codeOf(
      "from shop.pricing import price_of",
      "from shop.store import Store",
      "class CartStore(Store):",
      "    def total(self):",
      "        return price_of(self.items[0]) * 2",
    )
    const diagram = diagramOf({ "shop/pricing.py": PYTHON_PRICING, "shop/store.py": PYTHON_STORE, "shop/cart.py": cart }, PYTHON_PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["class Store", "  class CartStore", "    method CartStore.total", "function price_of (changed)"])
  })
})
