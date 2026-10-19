import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { nameOfBlock } from "@/trace/names"
import { listTraceNodes } from "@/trace-diagram"
import { listTracePaths } from "@/trace-diagram/paths"
import { flattenTraceNodes, linkTraceDiagram, storeTraceDiagram } from "@/trace-diagram/stored"
import type { TraceNode } from "@flightplan/configurations"
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

describe("the Trace Diagram of a group", () => {
  it("makes one node per root block on a chain, typed as that block, and an edge where a chain steps from one root block into another", () => {
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/cart.ts": CART }, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["function subtotalOf", "function priceOf (changed)"])
    expect(diagram?.traceNodeEdges).toStrictEqual([
      { id: "src/cart.ts#function@2:1 -> src/pricing.ts#function@1:1", from: "src/cart.ts#function@2:1", to: "src/pricing.ts#function@1:1" },
    ])
  })

  it("holds the blocks of the group themselves, the root block first, and the changed ones again as its diff blocks", () => {
    const diagram = diagramOf({ "src/pricing.ts": PRICING, "src/cart.ts": CART }, PRICING_CHANGE)
    const [cart, pricing] = diagram?.traceNodes ?? []
    const blockById = new Map(diagram?.astCodeGroup.codeBlocks.map((block) => [block.id, block] as const))

    expect([cart.codeBlocks[0].id, pricing.codeBlocks[0].id]).toStrictEqual([cart.id, pricing.id])
    expect(cart.codeBlocks.every((block) => blockById.get(block.id) === block)).toBe(true)
    expect([cart.diffCodeBlocks, pricing.diffCodeBlocks.map((block) => block.id)]).toStrictEqual([[], ["src/pricing.ts#function@1:1"]])
    expect(pricing.diffCodeBlocks[0]).toBe(blockById.get("src/pricing.ts#function@1:1"))
  })

  it("compresses the components that render each other into one node, each rendered component a child of the one that renders it", () => {
    const diagram = diagramOf(SHOP, ORDERS_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["component OrdersPage", "  component OrderList", "function loadOrders (changed)", "render-event onClick"])
    expect(diagram?.traceNodeEdges.map((edge) => edge.id).sort()).toStrictEqual([
      "src/order-list.tsx#component@2:1 -> src/order-list.tsx#render-event@3:14",
      "src/order-list.tsx#component@2:1 -> src/orders.ts#function@1:1",
      "src/order-list.tsx#render-event@3:14 -> src/orders.ts#function@1:1",
      "src/orders-page.tsx#component@2:1 -> src/order-list.tsx#component@2:1",
    ])
  })

  it("opens a loop of components at the one whose file imports the others, so the importing component is around the imported one", () => {
    const files = {
      "src/orders.ts": codeOf("export const loadOrders = () => {", "  return []", "}"),
      "src/order-list.tsx": codeOf(
        "import { loadOrders } from \"./orders\"",
        "export const OrderList = ({ Empty }) => <ul>{loadOrders()}<Empty /></ul>",
      ),
      "src/orders-page.tsx": codeOf("import { OrderList } from \"./order-list\"", "export const OrdersPage = () => <OrderList Empty={OrdersPage} />"),
    }
    const diagram = diagramOf(files, { "src/orders.ts": [rangeAt(2, 10, 2, 12)] })

    expect(diagram?.traceNodeEdges.map((edge) => edge.id)).toContain("src/order-list.tsx#component@2:1 -> src/orders-page.tsx#component@2:1")
    expect(outlineOfNodes(diagram)).toStrictEqual(["function loadOrders (changed)", "component OrdersPage", "  component OrderList"])
  })

  it("lists the events and the data fetches on a chain of a node as its trigger labels, with nothing written", () => {
    const withFetch = { ...SHOP, "src/orders.ts": codeOf("export const loadOrders = () => {", "  return fetch(\"/api/orders\")", "}") }
    const nodes = listTraceNodes(diagramOf(withFetch, { "src/orders.ts": [rangeAt(2, 10, 2, 30)] })?.traceNodes ?? [])
    const [, orderList, orders] = nodes

    expect(orderList.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type, codeBlock.name ?? null])).toStrictEqual([[null, "render-event", "onClick"]])
    expect(orders.triggerLabels.map(({ label, codeBlock }) => [label, codeBlock.type])).toStrictEqual([[null, "data-fetch"]])
  })

  it("gives a statement at the top level of a file no node and no edge, and keeps what it runs", () => {
    const files = { "src/pricing.ts": PRICING, "src/main.ts": codeOf("import { priceOf } from \"./pricing\"", "priceOf({ price: 1 })") }
    const diagram = diagramOf(files, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["function priceOf (changed)"])
    expect(diagram?.traceNodeEdges).toStrictEqual([])
  })

  it("has no diagram when only a statement at the top level of a file changed", () => {
    const page = { "src/page.tsx": codeOf("\"use client\"", "export const Page = () => <main />") }

    expect(diagramOf(page, { "src/page.tsx": [rangeAt(1, 1, 1, 13)] })).toBeNull()
  })

  it("has no diagram when no code that runs changed", () => {
    const types = { "src/types.ts": codeOf("export interface Item {", "  price: number", "}") }

    expect(diagramOf(types, { "src/types.ts": [rangeAt(2, 3, 2, 16)] })).toBeNull()
  })

  it("gives a value at the top level of a file that is not exported no node, and lists it as a step of every node that reads it", () => {
    const orders = codeOf(
      "const ORDERS_KEY = [\"orders\"]",
      "export const loadOrders = () => {",
      "  return ORDERS_KEY",
      "}",
      "export const countOrders = () => {",
      "  return ORDERS_KEY.length",
      "}",
    )
    const diagram = diagramOf({ "src/orders.ts": orders }, { "src/orders.ts": [rangeAt(1, 20, 1, 29)] })
    const nodes = diagram?.traceNodes ?? []

    expect(outlineOfNodes(diagram)).toStrictEqual(["function loadOrders (changed)", "function countOrders (changed)"])
    expect(diagram?.traceNodeEdges).toStrictEqual([])
    expect(nodes.map((node) => node.blockLabels.map(({ codeBlock }) => codeBlock.id))).toStrictEqual([
      ["src/orders.ts#root-variable@1:1"],
      ["src/orders.ts#root-variable@1:1"],
    ])
  })

  it("gives an exported value that is plain no node, and lists it as a step of every node that reads it", () => {
    const orders = codeOf("export const ORDERS_KEY = [\"orders\"]", "export const loadOrders = () => {", "  return ORDERS_KEY", "}")
    const diagram = diagramOf({ "src/orders.ts": orders }, { "src/orders.ts": [rangeAt(1, 27, 1, 36)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function loadOrders (changed)"])
    expect(diagram?.traceNodes[0].blockLabels.map(({ codeBlock }) => codeBlock.id)).toStrictEqual(["src/orders.ts#root-variable@1:1"])
  })

  it("keeps a node for an exported value made by a call", () => {
    const orders = codeOf("export const ORDERS_KEY = keyOf(\"orders\")", "export const loadOrders = () => {", "  return ORDERS_KEY", "}")
    const diagram = diagramOf({ "src/orders.ts": orders }, { "src/orders.ts": [rangeAt(1, 33, 1, 41)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function loadOrders", "root-variable ORDERS_KEY (changed)"])
  })

  it("carries a step through a value that is not exported on to the node it leads to", () => {
    const files = {
      "src/pricing.ts": PRICING,
      "src/cart.ts": codeOf("import { priceOf } from \"./pricing\"", "const DEFAULT_PRICE = priceOf({ price: 1 })", "export const defaultPriceOf = () => {", "  return DEFAULT_PRICE", "}"),
    }
    const diagram = diagramOf(files, PRICING_CHANGE)

    expect(outlineOfNodes(diagram)).toStrictEqual(["function defaultPriceOf", "function priceOf (changed)"])
    expect(diagram?.traceNodeEdges.map((edge) => edge.id)).toStrictEqual(["src/cart.ts#function@3:1 -> src/pricing.ts#function@1:1"])
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

  it("draws, for an entry segment, a shared route table with the route of its own page and none of the routes of another line", () => {
    const files = {
      "src/router.tsx": codeOf(
        "import { createBrowserRouter } from \"react-router\"",
        "import { PageA } from \"./page-a\"",
        "import { PageB } from \"./page-b\"",
        "export const router = createBrowserRouter([",
        "  { path: \"a\", element: <PageA /> },",
        "  { path: \"b\", element: <PageB /> },",
        "])",
      ),
      "src/page-a.tsx": codeOf("export const PageA = () => <main>A</main>"),
      "src/page-b.tsx": codeOf("export const PageB = () => <main>B</main>"),
    }
    const diffs = { "src/router.tsx": [rangeAt(5, 3, 6, 36)], "src/page-a.tsx": [rangeAt(1, 34, 1, 35)], "src/page-b.tsx": [rangeAt(1, 34, 1, 35)] }
    const diagram = diagramOf(files, diffs, { filePaths: ["src/page-a.tsx"], sharedFilePaths: ["src/router.tsx"], otherLineFilePaths: ["src/page-b.tsx"] })
    const router = diagram?.traceNodes.find((node) => node.type === "root-variable")

    expect(outlineOfNodes(diagram)).toStrictEqual(["root-variable router (changed)", "component PageA (changed)"])
    expect(router?.codeBlocks.some((block) => block.lineOfCodeRangeReference[0].start.line === 6)).toBe(false)
    expect(router?.blockLabels.map(({ codeBlock }) => codeBlock.lineOfCodeRangeReference[0].start.line)).toStrictEqual([5])
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
const MUTATION_FN = "src/use-apply-promo.ts#effect-callback@4:36"
const ON_SUCCESS = "src/use-apply-promo.ts#code-event@4:60"
const ON_SUCCESS_BODY = "src/use-apply-promo.ts#function@4:71"
const FETCH_PROMO = "src/promo.ts#function@1:1"
const PROMO_CONDITION = "src/promo.ts#condition@2:3"

const PANEL_FILES = {
  "src/promo.ts": PROMO_FILES["src/promo.ts"],
  "src/promo-panel.tsx": codeOf(
    "import { useMutation } from \"@tanstack/react-query\"",
    "import { fetchPromo } from \"./promo\"",
    "export const PromoPanel = () => {",
    "  const applyPromo = useMutation({ mutationFn: fetchPromo, onSuccess: () => { fetchPromo(\"x\") } })",
    "  return <button onClick={() => applyPromo.mutate(\"a\")}>Apply</button>",
    "}",
  ),
}
const PANEL = "src/promo-panel.tsx#component@3:1"
const PANEL_MUTATION = "src/promo-panel.tsx#component-effect@4:22"
const PANEL_MUTATION_FN = "src/promo-panel.tsx#effect-callback@4:36"
const PANEL_ON_SUCCESS = "src/promo-panel.tsx#code-event@4:60"
const PANEL_ON_SUCCESS_BODY = "src/promo-panel.tsx#function@4:71"

const panelNodes = (): TraceNode[] => listTraceNodes(presentDiagramOf(PANEL_FILES, PROMO_FILES_CHANGE).traceNodes)

const panelBlockIdsOf = (nodeId: string): string[] => (panelNodes().find((node) => node.id === nodeId)?.codeBlocks ?? []).map((block) => block.id)

const panelEdgeIds = (): string[] => presentDiagramOf(PANEL_FILES, PROMO_FILES_CHANGE).traceNodeEdges.map((edge) => edge.id)

const promoNodeIds = (): string[] => listTraceNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).traceNodes).map((node) => node.id)

const promoBlockIdsOf = (nodeId: string): string[] =>
  (listTraceNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).traceNodes).find((node) => node.id === nodeId)?.codeBlocks ?? []).map((block) => block.id)

const promoEdgeIds = (): string[] => presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).traceNodeEdges.map((edge) => edge.id)

describe("the nodes inside a root block", () => {
  it("makes one node of a root block that is no component, with the effects, the callbacks and the events inside it", () => {
    expect(new Set(promoNodeIds())).toStrictEqual(new Set([FORM, HOOK, FETCH_PROMO, SUBMIT_EVENT]))
    expect(promoNodeIds()).toHaveLength(4)
    expect(promoBlockIdsOf(HOOK)).toStrictEqual(expect.arrayContaining([MUTATION_FN, ON_SUCCESS, ON_SUCCESS_BODY]))
  })

  it("makes a node of an event, an effect and a callback inside a component, and none of a function or a condition", () => {
    expect(new Set(panelNodes().map((node) => node.id))).toStrictEqual(new Set([PANEL, PANEL_MUTATION, PANEL_MUTATION_FN, PANEL_ON_SUCCESS, "src/promo-panel.tsx#render-event@5:18", FETCH_PROMO]))
  })

  it("makes a node of a block the catalogue says is a node of its own, in a root block that is no component, and none of what is inside it", () => {
    const files = {
      "src/todos.ts": codeOf("export const listTodos = () => {", "  return []", "}"),
      "src/router.ts": codeOf(
        "import { initTRPC } from \"@trpc/server\"",
        "import { listTodos } from \"./todos\"",
        "const t = initTRPC.create()",
        "export const todoRouter = t.router({",
        "  list: t.procedure.query(() => listTodos()),",
        "  update: t.procedure.mutation(() => { setTimeout(() => listTodos(), 1) }),",
        "})",
      ),
    }
    const nodes = listTraceNodes(presentDiagramOf(files, { "src/todos.ts": [rangeAt(2, 10, 2, 12)] }).traceNodes)

    expect(nodes.map((node) => [node.type, nameOfBlock(node.codeBlocks[0])])).toStrictEqual([
      ["root-variable", "todoRouter"],
      ["resolver", "list"],
      ["resolver", "update"],
      ["function", "listTodos"],
    ])
  })

  it("gives an action written under a key of a store no node, and keeps it in the node of its store", () => {
    const files = {
      "src/pricing.ts": PRICING,
      "src/cart-store.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { priceOf } from \"./pricing\"",
        "export const useCartStore = create((set) => ({",
        "  total: 0,",
        "  add: (item) => {",
        "    set(() => ({ total: priceOf(item) }))",
        "  },",
        "}))",
      ),
      "src/cart.tsx": codeOf(
        "import { useCartStore } from \"./cart-store\"",
        "export const Cart = () => {",
        "  const add = useCartStore((state) => state.add)",
        "  return <button onClick={() => add(1)}>Add</button>",
        "}",
      ),
    }
    const nodes = listTraceNodes(presentDiagramOf(files, PRICING_CHANGE).traceNodes)

    expect(nodes.map((node) => [node.type, nameOfBlock(node.codeBlocks[0])])).toStrictEqual(expect.arrayContaining([
      ["state", "useCartStore"],
      ["function", "priceOf"],
    ]))
    expect(nodes.filter((node) => node.codeBlocks[0].astGraph.filePath === "src/cart-store.ts").map((node) => node.codeBlocks[0].name)).toStrictEqual(["useCartStore"])
  })

  it("keeps a condition, a declaration and the markup of a root block in the node of that root block", () => {
    expect(promoBlockIdsOf(FORM)).toStrictEqual(expect.arrayContaining([SHOWN_CONDITION, "src/promo-form.tsx#external-value@6:3"]))
    expect(promoBlockIdsOf(FETCH_PROMO)).toContain(PROMO_CONDITION)
  })

  it("holds a function an event of its root block is handed in the node of that event, with what is inside it", () => {
    expect(promoBlockIdsOf(SUBMIT_EVENT)).toStrictEqual(expect.arrayContaining([SUBMIT_EVENT, SUBMIT, SUBMIT_CONDITION]))
    expect(promoBlockIdsOf(FORM)).not.toContain(SUBMIT_CONDITION)
  })

  it("holds a block that is a node of its own as the last block on its way down, and what is inside it in its own node", () => {
    expect(panelBlockIdsOf(PANEL)).toContain(PANEL_MUTATION)
    expect(panelBlockIdsOf(PANEL)).not.toContain(PANEL_MUTATION_FN)
  })

  it("makes one node of an event and the function written in place of it", () => {
    expect(panelNodes().map((node) => node.id)).not.toContain(PANEL_ON_SUCCESS_BODY)
    expect(panelBlockIdsOf(PANEL_ON_SUCCESS)).toStrictEqual([PANEL_ON_SUCCESS, PANEL_ON_SUCCESS_BODY, "src/promo-panel.tsx#call@4:79"])
  })

  it("makes a node of the effect around a callback on a chain, though no chain passes through the effect", () => {
    expect(panelBlockIdsOf(PANEL_MUTATION)).toStrictEqual([PANEL_MUTATION, PANEL_MUTATION_FN, PANEL_ON_SUCCESS])
  })

  it("joins a node to each node written inside it, and leaves out the edge of a step that only goes further inside", () => {
    expect(promoEdgeIds()).toContain(`${FORM} -> ${SUBMIT_EVENT}`)
    expect(panelEdgeIds()).toStrictEqual(expect.arrayContaining([
      `${PANEL} -> ${PANEL_MUTATION}`,
      `${PANEL_MUTATION} -> ${PANEL_MUTATION_FN}`,
      `${PANEL_MUTATION} -> ${PANEL_ON_SUCCESS}`,
    ]))
    expect(panelEdgeIds()).not.toContain(`${PANEL} -> ${PANEL_MUTATION_FN}`)
  })

  it("draws a step from the node that takes it, and carries a step through a function and a value of the component on to what they lead to", () => {
    expect(promoEdgeIds()).toStrictEqual(expect.arrayContaining([
      `${SUBMIT_EVENT} -> ${HOOK}`,
      `${FORM} -> ${HOOK}`,
      `${FORM} -> ${FETCH_PROMO}`,
      `${HOOK} -> ${FETCH_PROMO}`,
    ]))
    expect(panelEdgeIds()).toStrictEqual(expect.arrayContaining([`${PANEL_MUTATION_FN} -> ${FETCH_PROMO}`, `${PANEL_ON_SUCCESS} -> ${FETCH_PROMO}`]))
    expect(promoEdgeIds()).not.toContain(`${SUBMIT_EVENT} -> ${FORM}`)
    expect(promoEdgeIds()).toHaveLength(5)
  })

  it("keeps the call that makes a state and the callback handed to it in the node of that state", () => {
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
    const nodes = listTraceNodes(presentDiagramOf(files, PRICING_CHANGE).traceNodes)

    expect(nodes.map((node) => [node.type, node.codeBlocks[0].name ?? null])).toStrictEqual([["state", "useCartStore"], ["function", "priceOf"]])
  })

  it("does not list the block a node stands for as a trigger label of that node", () => {
    const nodes = listTraceNodes(presentDiagramOf(PROMO_FILES, PROMO_FILES_CHANGE).traceNodes)
    const triggerIdsOf = (nodeId: string): string[] => (nodes.find((node) => node.id === nodeId)?.triggerLabels ?? []).map((trigger) => trigger.codeBlock.id)

    const panelTriggerIds = (panelNodes().find((node) => node.id === PANEL_MUTATION)?.triggerLabels ?? []).map((trigger) => trigger.codeBlock.id)

    expect([triggerIdsOf(FORM), triggerIdsOf(SUBMIT_EVENT), panelTriggerIds]).toStrictEqual([[SUBMIT_EVENT], [], [PANEL_ON_SUCCESS]])
  })
})

describe("the forms of a Trace Diagram", () => {
  it("stores every block as its id and links the stored form back to the same blocks", () => {
    const diagram = presentDiagramOf(SHOP, ORDERS_CHANGE)
    const stored = storeTraceDiagram(diagram)

    expect(stored.traceNodes[0]).toMatchObject({ id: "src/orders-page.tsx#component@2:1", type: "component", label: null, children: [{ id: "src/order-list.tsx#component@2:1" }] })
    expect(stored.traceNodes[1].diffCodeBlockIds).toStrictEqual(["src/orders.ts#function@1:1"])
    expect(JSON.parse(JSON.stringify(stored))).toStrictEqual(stored)
    expect(linkTraceDiagram(stored, diagram.astCodeGroup, diagram.importGraphGroup)).toStrictEqual(diagram)
  })

  it("flattens the nodes for an agent: every node at any depth once, with its parent and no children", () => {
    const flat = flattenTraceNodes(diagramOf(SHOP, ORDERS_CHANGE)?.traceNodes ?? [])

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
    expect(listTracePaths(presentDiagramOf(SHOP, ORDERS_CHANGE))).toStrictEqual([
      "src/orders-page.tsx#component@2:1 → src/order-list.tsx#component@2:1 → src/orders.ts#function@1:1",
      "src/orders-page.tsx#component@2:1 → src/order-list.tsx#component@2:1 → src/order-list.tsx#render-event@3:14 → src/orders.ts#function@1:1",
    ])
  })
})
