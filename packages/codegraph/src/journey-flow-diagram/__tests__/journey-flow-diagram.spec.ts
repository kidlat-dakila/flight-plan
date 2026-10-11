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

    expect(outlineOfNodes(diagram)).toStrictEqual(["component OrdersPage", "  component OrderList", "function loadOrders (changed)", "render-event onClick"])
    expect(diagram?.journeyNodeEdges.map((edge) => edge.id).sort()).toStrictEqual([
      "src/order-list.tsx#component@2:1 -> src/order-list.tsx#render-event@3:14",
      "src/order-list.tsx#component@2:1 -> src/orders.ts#function@1:1",
      "src/order-list.tsx#render-event@3:14 -> src/orders.ts#function@1:1",
      "src/orders-page.tsx#component@2:1 -> src/order-list.tsx#component@2:1",
    ])
  })

  it("lists the events and the data fetches on a chain of a node as its trigger labels, with nothing written", () => {
    const withFetch = { ...SHOP, "src/orders.ts": codeOf("export const loadOrders = () => {", "  return fetch(\"/api/orders\")", "}") }
    const nodes = listJourneyNodes(diagramOf(withFetch, { "src/orders.ts": [rangeAt(2, 10, 2, 30)] })?.journeyNodes ?? [])
    const [, orderList, orders] = nodes

    expect(orderList.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type, codeBlock.name ?? null])).toStrictEqual([[null, "render-event", "onClick"]])
    expect(orders.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type])).toStrictEqual([[null, "data-fetch"]])
  })

  it("gives a statement at the top level of a file no node and no edge, and keeps what it runs", () => {
    const files = { "src/pricing.ts": PRICING, "src/main.ts": codeOf("import { priceOf } from \"./pricing\"", "priceOf({ price: 1 })") }
    const diagram = diagramOf(files, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["function priceOf (changed)"])
    expect(diagram?.journeyNodeEdges).toStrictEqual([])
  })

  it("has no diagram when only a statement at the top level of a file changed", () => {
    const page = { "src/page.tsx": codeOf("\"use client\"", "export const Page = () => <main />") }

    expect(diagramOf(page, { "src/page.tsx": [rangeAt(1, 1, 1, 13)] })).toBeNull()
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
    const diagram = diagramOf(files, diffs, { filePaths: ["src/page-a.ts"], sharedFilePaths: ["src/format.ts"], otherLineFilePaths: ["src/page-b.ts"] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function pageA (changed)", "function format (changed)"])
  })

  it("keeps, for the shared segment, the chains that lead to a shared change and pass through no other line of change", () => {
    const files = {
      "src/format.ts": codeOf("export const format = (text) => {", "  return text.trim()", "}"),
      "src/page-a.ts": codeOf("import { format } from \"./format\"", "export const pageA = () => {", "  return format(\"A\")", "}"),
      "src/report.ts": codeOf("import { format } from \"./format\"", "export const report = () => {", "  return format(\"R\")", "}"),
    }
    const diffs = { "src/format.ts": [rangeAt(2, 10, 2, 21)], "src/page-a.ts": [rangeAt(3, 17, 3, 20)] }
    const diagram = diagramOf(files, diffs, { filePaths: ["src/format.ts"], sharedFilePaths: [], otherLineFilePaths: ["src/page-a.ts"] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function report", "function format (changed)"])
  })
})

const PROMO_FILES = {
  "src/promo.ts": codeOf("export const fetchPromo = (code) => {", "  if (code.length > 3) {", "    return code.trim()", "  }", "  return null", "}"),
  "src/use-apply-promo.ts": codeOf(
    "import { useMutation } from \"@tanstack/react-query\"",
    "import { fetchPromo } from \"./promo\"",
    "export const useApplyPromo = () => {",
    "  const applyPromo = useMutation({ mutationFn: fetchPromo, onSuccess: () => { fetchPromo(\"x\") } })",
    "  return applyPromo",
    "}",
  ),
  "src/promo-form.tsx": codeOf(
    "import { useState } from \"react\"",
    "import { fetchPromo } from \"./promo\"",
    "import { useApplyPromo } from \"./use-apply-promo\"",
    "export const PromoForm = () => {",
    "  const [code, setCode] = useState(\"\")",
    "  const { mutate } = useApplyPromo()",
    "  const submit = () => {",
    "    if (code) { mutate(code) }",
    "  }",
    "  const shown = code ? fetchPromo(code) : null",
    "  return <form onSubmit={submit}>{shown}<input onChange={() => setCode(\"\")} /></form>",
    "}",
  ),
}
const PROMO_FILES_CHANGE = { "src/promo.ts": [rangeAt(3, 12, 3, 22)] }
const FORM = "src/promo-form.tsx#component@4:1"
const SUBMIT_EVENT = "src/promo-form.tsx#render-event@11:16"
const SUBMIT = "src/promo-form.tsx#function@7:3"
const SUBMIT_CONDITION = "src/promo-form.tsx#condition@8:5"
const SHOWN_CONDITION = "src/promo-form.tsx#condition@10:17"
const HOOK = "src/use-apply-promo.ts#hook@3:1"
const MUTATION = "src/use-apply-promo.ts#component-effect@4:22"
const MUTATION_FN = "src/use-apply-promo.ts#effect-callback@4:36"
const ON_SUCCESS = "src/use-apply-promo.ts#code-event@4:60"
const ON_SUCCESS_BODY = "src/use-apply-promo.ts#function@4:71"
const FETCH_PROMO = "src/promo.ts#function@1:1"
const PROMO_CONDITION = "src/promo.ts#condition@2:3"

const promoNodeIds = (): string[] => listJourneyNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).journeyNodes).map((node) => node.id)

const promoBlockIdsOf = (nodeId: string): string[] =>
  (listJourneyNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).journeyNodes).find((node) => node.id === nodeId)?.codeBlocks ?? []).map((block) => block.id)

const promoEdgeIds = (): string[] => presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).journeyNodeEdges.map((edge) => edge.id)

describe("the nodes inside a root block", () => {
  it("makes a node of an event, an effect and a callback inside a root block, and none of a function or a condition", () => {
    expect(new Set(promoNodeIds())).toStrictEqual(new Set([FORM, HOOK, FETCH_PROMO, SUBMIT_EVENT, MUTATION, MUTATION_FN, ON_SUCCESS]))
    expect(promoNodeIds()).toHaveLength(7)
  })

  it("keeps a function, a condition, a declaration and the markup of a root block in the node of that root block", () => {
    expect(promoBlockIdsOf(FORM)).toStrictEqual(expect.arrayContaining([SUBMIT, SUBMIT_CONDITION, SHOWN_CONDITION, "src/promo-form.tsx#external-value@6:3"]))
    expect(promoBlockIdsOf(FETCH_PROMO)).toContain(PROMO_CONDITION)
  })

  it("holds a block that is a node of its own as the last block on its way down, and what is inside it in its own node", () => {
    expect(promoBlockIdsOf(HOOK)).toContain(MUTATION)
    expect(promoBlockIdsOf(HOOK)).not.toContain(MUTATION_FN)
  })

  it("makes one node of an event and the function written in place of it", () => {
    expect(promoNodeIds()).not.toContain(ON_SUCCESS_BODY)
    expect(promoBlockIdsOf(ON_SUCCESS)).toStrictEqual([ON_SUCCESS, ON_SUCCESS_BODY])
  })

  it("makes a node of the effect around a callback on a chain, though no chain passes through the effect", () => {
    expect(promoBlockIdsOf(MUTATION)).toStrictEqual([MUTATION, MUTATION_FN, ON_SUCCESS])
  })

  it("joins a node to each node written inside it, and leaves out the edge of a step that only goes further inside", () => {
    expect(promoEdgeIds()).toStrictEqual(expect.arrayContaining([
      `${FORM} -> ${SUBMIT_EVENT}`,
      `${HOOK} -> ${MUTATION}`,
      `${MUTATION} -> ${MUTATION_FN}`,
      `${MUTATION} -> ${ON_SUCCESS}`,
    ]))
    expect(promoEdgeIds()).not.toContain(`${HOOK} -> ${MUTATION_FN}`)
  })

  it("draws a step from the node that takes it, and carries a step through a function and a value of the component on to what they lead to", () => {
    expect(promoEdgeIds()).toStrictEqual(expect.arrayContaining([
      `${SUBMIT_EVENT} -> ${HOOK}`,
      `${FORM} -> ${HOOK}`,
      `${FORM} -> ${FETCH_PROMO}`,
      `${MUTATION_FN} -> ${FETCH_PROMO}`,
      `${ON_SUCCESS} -> ${FETCH_PROMO}`,
    ]))
    expect(promoEdgeIds()).not.toContain(`${SUBMIT_EVENT} -> ${FORM}`)
    expect(promoEdgeIds()).toHaveLength(9)
  })

  it("keeps the call that makes a state, the callback handed to it and the functions inside it in the node of that state", () => {
    const files = {
      "src/pricing.ts": PRICING,
      "src/cart-store.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { priceOf } from \"./pricing\"",
        "export const useCartStore = create((set) => ({",
        "  total: 0,",
        "  add: (item) => set({ total: priceOf(item) }),",
        "}))",
      ),
    }
    const nodes = listJourneyNodes(presentDiagramOf(files, PRICING_CHANGE).journeyNodes)

    expect(nodes.map((node) => [node.type, node.codeBlocks[0].name ?? null])).toStrictEqual([["state", "useCartStore"], ["function", "priceOf"]])
  })

  it("does not list the block a node stands for as a trigger label of that node", () => {
    const nodes = listJourneyNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).journeyNodes)
    const triggerIdsOf = (nodeId: string): string[] => (nodes.find((node) => node.id === nodeId)?.triggerLabels ?? []).map((trigger) => trigger.codeBlock.id)

    expect([triggerIdsOf(FORM), triggerIdsOf(SUBMIT_EVENT), triggerIdsOf(MUTATION)]).toStrictEqual([[SUBMIT_EVENT], [], [ON_SUCCESS]])
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
      ["src/order-list.tsx#render-event@3:14", null],
    ])
    expect(flat.every((node) => !("children" in node))).toBe(true)
    expect(flat[1].triggerLabels).toStrictEqual([{ label: null, codeBlockId: "src/order-list.tsx#render-event@3:14" }])
  })

  it("lists every path of a diagram as a line, from a node nothing leads to down to its last node", () => {
    expect(listJourneyPaths(presentDiagramOf(SHOP, ORDERS_CHANGE))).toStrictEqual([
      "src/orders-page.tsx#component@2:1 → src/order-list.tsx#component@2:1 → src/orders.ts#function@1:1",
      "src/orders-page.tsx#component@2:1 → src/order-list.tsx#component@2:1 → src/order-list.tsx#render-event@3:14 → src/orders.ts#function@1:1",
    ])
  })
})
