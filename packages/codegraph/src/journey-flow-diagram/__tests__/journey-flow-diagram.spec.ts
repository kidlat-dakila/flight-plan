import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { listJourneyPaths } from "@/journey-flow-diagram/paths"
import { flattenJourneyNodes, linkJourneyFlowDiagram, storeJourneyFlowDiagram } from "@/journey-flow-diagram/stored"
import { diagramOf, outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const PRICING = codeOf("export const priceOf = (item) => {", "  return item.price", "}")
const CART = codeOf("import { priceOf } from \"./pricing\"", "export const subtotalOf = (items) => {", "  return items.map(priceOf)", "}")
const PRICING_CHANGE = { "src/pricing.ts": [rangeAt(2, 3, 2, 9)] }

const SHOP = {
  "src/orders.ts": codeOf("export const loadOrders = () => {", "  return []", "}"),
  "src/order-list.tsx": codeOf(
    "import { loadOrders } from \"./orders\"",
    "export const OrderList = () => {",
    "  return <ul onClick={() => loadOrders()}>{loadOrders()}</ul>",
    "}",
  ),
  "src/orders-page.tsx": codeOf("import { OrderList } from \"./order-list\"", "export const OrdersPage = () => <main><OrderList /></main>"),
}
const ORDERS_CHANGE = { "src/orders.ts": [rangeAt(2, 10, 2, 12)] }

describe("the Journey Flow Diagram of a group", () => {
  it("makes one node per root block on a chain, typed as that block, and an edge where a chain steps from one root block into another", () => {
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/cart.ts": CART }, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["function subtotalOf", "function priceOf (changed)"])
    expect(diagram?.journeyNodeEdges).toStrictEqual([
      { id: "src/cart.ts#function@2:1 -> src/pricing.ts#function@1:1", from: "src/cart.ts#function@2:1", to: "src/pricing.ts#function@1:1" },
    ])
  })

  it("holds the blocks of the group themselves, the root block first, and the changed ones again as its diff blocks", () => {
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/cart.ts": CART }, PRICING_CHANGE)
    const [cart, pricing] = diagram?.journeyNodes ?? []
    const blockById = new Map(diagram?.astCodeGroup.codeBlocks.map((block) => [block.id, block] as const))

    expect([cart.codeBlocks[0].id, pricing.codeBlocks[0].id]).toStrictEqual([cart.id, pricing.id])
    expect(cart.codeBlocks.every((block) => blockById.get(block.id) === block)).toBe(true)
    expect([cart.diffCodeBlocks, pricing.diffCodeBlocks.map((block) => block.id)]).toStrictEqual([[], ["src/pricing.ts#function@1:1"]])
    expect(pricing.diffCodeBlocks[0]).toBe(blockById.get("src/pricing.ts#function@1:1"))
  })

  it("compresses the components that render each other into one node, each rendered component a child of the one that renders it", () => {
    const diagram = diagramOf(SHOP, ORDERS_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["component OrdersPage", "  component OrderList", "function loadOrders (changed)"])
    expect(diagram?.journeyNodeEdges.map((edge) => edge.id).sort()).toStrictEqual([
      "src/order-list.tsx#component@2:1 -> src/orders.ts#function@1:1",
      "src/orders-page.tsx#component@2:1 -> src/order-list.tsx#component@2:1",
    ])
  })

  it("lists the events and the data fetches on a chain of a node as its trigger labels, with nothing written", () => {
    const withFetch = { ...SHOP, "src/orders.ts": codeOf("export const loadOrders = () => {", "  return fetch(\"/api/orders\")", "}") }
    const [, orderList] = listJourneyNodes(diagramOf(withFetch, { "src/orders.ts": [rangeAt(2, 10, 2, 30)] })?.journeyNodes ?? [])
    const [, , orders] = listJourneyNodes(diagramOf(withFetch, { "src/orders.ts": [rangeAt(2, 10, 2, 30)] })?.journeyNodes ?? [])

    expect(orderList.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type, codeBlock.name ?? null])).toStrictEqual([[null, "render-event", "onClick"]])
    expect(orders.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type])).toStrictEqual([[null, "data-fetch"]])
  })

  it("has no diagram when no code that runs changed", () => {
    const types = { "src/types.ts": codeOf("export interface Item {", "  price: number", "}") }

    expect(diagramOf(types, { "src/types.ts": [rangeAt(2, 3, 2, 16)] })).toBeNull()
  })

  it("keeps, for an entry segment, the chains that lead to its own change and what they run below it that leads to a shared change", () => {
    const files = {
      "src/format.ts": codeOf("export const format = (text) => {", "  return text.trim()", "}"),
      "src/page-a.ts": codeOf("import { format } from \"./format\"", "export const pageA = () => {", "  return format(\"A\")", "}"),
      "src/page-b.ts": codeOf("import { format } from \"./format\"", "export const pageB = () => {", "  return format(\"B\")", "}"),
    }
    const diffs = { "src/format.ts": [rangeAt(2, 10, 2, 21)], "src/page-a.ts": [rangeAt(3, 17, 3, 20)], "src/page-b.ts": [rangeAt(3, 17, 3, 20)] }
    const diagram = diagramOf(files, diffs, { filePaths: ["src/page-a.ts"], sharedFilePaths: ["src/format.ts"] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function pageA (changed)", "function format (changed)"])
  })
})

describe("the forms of a Journey Flow Diagram", () => {
  it("stores every block as its id and links the stored form back to the same blocks", () => {
    const diagram = presentDiagramOf(SHOP, ORDERS_CHANGE)
    const stored = storeJourneyFlowDiagram(diagram)

    expect(stored.journeyNodes[0]).toMatchObject({ id: "src/orders-page.tsx#component@2:1", type: "component", label: null, children: [{ id: "src/order-list.tsx#component@2:1" }] })
    expect(stored.journeyNodes[1].diffCodeBlockIds).toStrictEqual(["src/orders.ts#function@1:1"])
    expect(JSON.parse(JSON.stringify(stored))).toStrictEqual(stored)
    expect(linkJourneyFlowDiagram(stored, diagram.astCodeGroup, diagram.importGraphGroup)).toStrictEqual(diagram)
  })

  it("flattens the nodes for an agent: every node at any depth once, with its parent and no children", () => {
    const flat = flattenJourneyNodes(diagramOf(SHOP, ORDERS_CHANGE)?.journeyNodes ?? [])

    expect(flat.map(({ id, parentId }) => [id, parentId])).toStrictEqual([
      ["src/orders-page.tsx#component@2:1", null],
      ["src/order-list.tsx#component@2:1", "src/orders-page.tsx#component@2:1"],
      ["src/orders.ts#function@1:1", null],
    ])
    expect(flat.every((node) => !("children" in node))).toBe(true)
    expect(flat[1].triggerLabels).toStrictEqual([{ label: null, codeBlockId: "src/order-list.tsx#render-event@3:14" }])
  })

  it("lists every path of a diagram as a line, from a node nothing leads to down to its last node", () => {
    expect(listJourneyPaths(presentDiagramOf(SHOP, ORDERS_CHANGE))).toStrictEqual([
      "src/orders-page.tsx#component@2:1 → src/order-list.tsx#component@2:1 → src/orders.ts#function@1:1",
    ])
  })
})
