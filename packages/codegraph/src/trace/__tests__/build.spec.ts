import { createSegment, createViewContext } from "@/__tests__/review-fixture"
import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { buildTrace, buildTraceTabs } from "@/trace/build"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceNodeView } from "@flightplan/configurations"

const PROMO = codeOf("export const fetchPromo = (code) => {", "  return code.trim()", "}")
const USE_APPLY_PROMO = codeOf(
  "import { useMutation } from \"@tanstack/react-query\"",
  "import { fetchPromo } from \"./promo\"",
  "export const useApplyPromo = () => {",
  "  return useMutation({ mutationFn: fetchPromo })",
  "}",
)
const PROMO_FORM = codeOf(
  "import { useEffect, useMemo, useState } from \"react\"",
  "import { fetchPromo } from \"./promo\"",
  "import { useApplyPromo } from \"./use-apply-promo\"",
  "export const PromoForm = ({ onApplied }) => {",
  "  const [code, setCode] = useState(\"\")",
  "  const { mutate } = useApplyPromo()",
  "  const shown = useMemo(() => fetchPromo(code), [code])",
  "  useEffect(() => { fetchPromo(code) }, [code])",
  "  return <form onSubmit={() => { mutate(code); onApplied(shown) }}><input onChange={() => setCode(\"\")} /></form>",
  "}",
)
const FILES = { "src/promo.ts": PROMO, "src/use-apply-promo.ts": USE_APPLY_PROMO, "src/promo-form.tsx": PROMO_FORM }
const PROMO_CHANGE = { "src/promo.ts": [rangeAt(2, 10, 2, 20)] }

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewsOf = (): TraceNodeView[] => {
  const segment = createSegment({ traceDiagram: presentDiagramOf(FILES, PROMO_CHANGE) })
  return listNodeViews(buildTrace(segment, "", [], createViewContext()).diagram?.nodes ?? [])
}

const blockListsOf = (nodeId: string): [string, string, string[]][] =>
  (nodeViewsOf().find((node) => node.id === nodeId)?.blockLists ?? []).map(({ kind, label, blocks }) => [kind, label, blocks.map((block) => block.name)])

describe("the head of a node of the trace band", () => {
  it("gives the name of the code and its path down to the last two folders", () => {
    const deepPath = "apps/shop/src/routes/orders/index.ts"
    const files = { [deepPath]: PROMO, "apps/shop/src/routes/orders/apply.ts": codeOf("import { fetchPromo } from \"./index\"", "export const applyPromo = (code) => fetchPromo(code)") }
    const segment = createSegment({ traceDiagram: presentDiagramOf(files, { [deepPath]: [rangeAt(2, 10, 2, 20)] }) })
    const node = buildTrace(segment, "", [], createViewContext()).diagram?.nodes.find((one) => one.name === "fetchPromo")

    expect([node?.name, node?.shortPath]).toStrictEqual(["fetchPromo", "routes/orders/index.ts"])
  })
})

describe("the classification of a node of the trace band", () => {
  it("gives each card the classification of its code block, picked by the hierarchy", () => {
    const form = nodeViewsOf().find((node) => node.name === "PromoForm")

    expect(form?.classification).toStrictEqual({ key: "component", label: "Component" })
  })
})

describe("the hints of the trace band", () => {
  it("gives a card with no label a hint from what its code is and what changed in it", () => {
    const hints = Object.fromEntries(nodeViewsOf().map((node) => [node.name, node.hint]))

    expect(hints.fetchPromo).toBe("Changes plain logic.")
    expect(hints.PromoForm).toBe("No lines changed in a component, but it uses code that did.")
  })

  it("gives each trigger label and listed block with no label a hint of its own", () => {
    const form = nodeViewsOf().find((node) => node.name === "PromoForm")

    expect(form?.triggerLabels.map((trigger) => [trigger.name, trigger.hint])).toStrictEqual([["form.onSubmit", "No lines changed in a component, but it uses code that did."]])
    expect(form?.blockLists.flatMap((list) => list.blocks).find((block) => block.name === "useEffect")?.hint).toBe("No lines changed in an effect, but it uses code that did.")
  })

  it("gives a diagram with no description a hint naming what its cards are, once each", () => {
    const segment = createSegment({ traceDiagram: presentDiagramOf(FILES, PROMO_CHANGE) })

    expect(buildTrace(segment, "", [], createViewContext()).diagram?.descriptionHint).toBe("Runs through a component, a hook, plain logic and an effect.")
  })

  it("gives no hint to what is written", () => {
    const diagram = presentDiagramOf(FILES, PROMO_CHANGE)
    const written = { ...diagram, description: "A shopper types a code.", traceNodes: diagram.traceNodes.map((node) => ({ ...node, label: "Applies a promo code" })) }
    const band = buildTrace(createSegment({ traceDiagram: written }), "", [], createViewContext())

    expect(band.diagram?.descriptionHint).toBeNull()
    expect(band.diagram?.nodes.map((node) => node.hint)).toStrictEqual(band.diagram?.nodes.map(() => null))
  })

  it("names a diagram by the names of its changed cards until its title is written", () => {
    const diagram = buildTrace(createSegment({ traceDiagram: presentDiagramOf(FILES, PROMO_CHANGE) }), "", [], createViewContext()).diagram

    expect(diagram?.writtenTitle).toBeNull()
    expect(diagram?.title).not.toBe("")
  })

  it("names a diagram and its tab by the title written for it", () => {
    const written = { ...presentDiagramOf(FILES, PROMO_CHANGE), title: "Apply promo code flow diagram" }
    const segments = [createSegment({ id: "one", traceDiagram: written }), createSegment({ id: "two", traceDiagram: presentDiagramOf(FILES, PROMO_CHANGE) })]
    const band = buildTraceTabs(segments, "", [], createViewContext())

    expect(band.heading).toBe("Trace Diagram")
    expect(band.tabs[0]).toMatchObject({ label: "Apply promo code flow diagram", diagram: { title: "Apply promo code flow diagram", writtenTitle: "Apply promo code flow diagram" } })
    expect(band.tabs[1]?.diagram.writtenTitle).toBeNull()
  })
})

describe("a card of the trace band being written", () => {
  it("is being written while the agent writes a required card that has a label to write", () => {
    const diagram = presentDiagramOf(FILES, PROMO_CHANGE)
    const required = { ...diagram, traceNodes: diagram.traceNodes.map((node) => ({ ...node, isRequired: true })) }
    const writingOf = (isWriting: boolean): boolean[] =>
      listNodeViews(buildTrace(createSegment({ traceDiagram: required }), "", [], { ...createViewContext(), isWriting }).diagram?.nodes ?? [])
        .filter((node) => required.traceNodes.some((stored) => stored.id === node.id))
        .map((node) => node.isBeingWritten)

    expect(writingOf(true).every(Boolean)).toBe(true)
    expect(writingOf(false).some(Boolean)).toBe(false)
  })
})

describe("the rows of a node of the trace band", () => {
  it("gives each listed block and each trigger label the lines of its block", () => {
    const form = nodeViewsOf().find((node) => node.name === "PromoForm")
    const rows = [...(form?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(form?.triggerLabels ?? [])]

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.lines.length > 0 && row.lines.every(([lineStart, lineEnd]) => lineStart >= 4 && lineEnd <= 10))).toBe(true)
    expect(form?.triggerLabels.find((trigger) => trigger.name === "form.onSubmit")?.lines).toStrictEqual([[9, 9]])
  })
})

describe("the block labels of a node of the trace band", () => {
  it("gives a listed block the label written for it, and the name of its code as a draft until then", () => {
    const traceDiagram = presentDiagramOf(FILES, PROMO_CHANGE)
    const [written] = traceDiagram.traceNodes.flatMap((node) => node.blockLabels)
    const labelled = {
      ...traceDiagram,
      traceNodes: traceDiagram.traceNodes.map((node) => ({ ...node, blockLabels: node.blockLabels.map((listed) => (listed === written ? { ...listed, label: "Holds the typed code" } : listed)) })),
    }
    const views = listNodeViews(buildTrace(createSegment({ traceDiagram: labelled }), "", [], createViewContext()).diagram?.nodes ?? [])
    const steps = views.flatMap((node) => node.blockLists).filter(({ kind }) => kind !== "argument").flatMap(({ blocks }) => blocks)

    expect(traceDiagram.traceNodes.flatMap((node) => node.blockLabels).every((listed) => listed.label === null)).toBe(true)
    expect(steps.filter((block) => !block.isDraft).map((block) => [block.id, block.label])).toStrictEqual([[written.codeBlock.id, "Holds the typed code"]])
    expect(steps.filter((block) => block.isDraft).every((block) => block.label === block.name)).toBe(true)
  })
})

describe("the edges of the trace band", () => {
  it("names the row of the block an edge leaves, one edge per row, and no row where it leaves or reaches the head of a node", () => {
    const segment = createSegment({ traceDiagram: presentDiagramOf(FILES, PROMO_CHANGE) })
    const edges = buildTrace(segment, "", [], createViewContext()).diagram?.edges ?? []

    expect(edges.map(({ from, to, fromRowId, toRowId }) => [from, fromRowId, to, toRowId])).toStrictEqual([
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#external-value@6:3", "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#call@9:34@9:34", "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#call@9:48@9:48", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#effect-callback@8:13", "src/promo-form.tsx#call@8:21@8:21", "src/promo.ts#function@1:1", null],
      ["src/use-apply-promo.ts#hook@3:1", null, "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#derived@7:3", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#component-effect@8:3", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#render-event@9:16", null],
      ["src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#effect-callback@8:13", "src/promo-form.tsx#effect-callback@8:13", null],
    ])
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
  })
})

describe("the block lists of a node of the trace band", () => {
  it("lists the state, the hooks and the effects of a node that are on a chain, each kind once, and leaves out the state no chain reads on the way to a change", () => {
    expect(blockListsOf("src/promo-form.tsx#component@4:1")).toStrictEqual([
      ["state", "State", ["shown"]],
      ["hook", "Hooks", ["useApplyPromo"]],
      ["effect", "Effects", ["useEffect"]],
    ])
  })

  it("gives a hook the rows of a function card, with no row for a hook of a library it calls", () => {
    expect(blockListsOf("src/use-apply-promo.ts#hook@3:1")).toStrictEqual([["return", "Returns", ["return"]]])
  })

  it("lists an effect that makes a state as that state, though no chain passes through its declaration, and names another effect after what it calls", () => {
    const files = {
      "src/cart-store.ts": codeOf("import { create } from \"zustand\"", "export const selectTotal = (state) => state.total", "export const useCartStore = create(() => ({ total: 0 }))"),
      "src/poll.ts": codeOf("export const poll = (run) => run()"),
      "src/cart-summary.tsx": codeOf(
        "import { selectTotal, useCartStore } from \"./cart-store\"",
        "import { poll } from \"./poll\"",
        "export const CartSummary = () => {",
        "  const total = useCartStore(selectTotal)",
        "  poll(() => 1)",
        "  return <p>{total}</p>",
        "}",
      ),
    }
    const diagram = presentDiagramOf(files, { "src/cart-store.ts": [rangeAt(3, 44, 3, 52)], "src/poll.ts": [rangeAt(1, 31, 1, 36)] })
    const [summary] = listNodeViews(buildTrace(createSegment({ traceDiagram: diagram }), "", [], createViewContext()).diagram?.nodes ?? [])

    expect(diagram.traceNodes[0].codeBlocks.map((block) => block.type)).not.toContain("state")
    expect(summary.blockLists.map(({ kind, blocks }) => [kind, blocks.map((block) => block.name)])).toStrictEqual([["state", ["total"]], ["effect", ["poll"]]])
  })

  it("lists an argument of a function card as a row with nothing to write, no row for a read through it, and no parameter", () => {
    const promo = nodeViewsOf().find((node) => node.id === "src/promo.ts#function@1:1")

    expect(promo?.blockLists.map(({ kind, blocks }) => [kind, blocks.map(({ name, isDraft }) => [name, isDraft])])).toStrictEqual([["argument", [["code", false]]], ["return", [["return", true]]]])
    expect(promo?.parameters).toStrictEqual([])
  })
})

const HANDLERS = {
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
const HANDLERS_CHANGE = { "src/promo.ts": [rangeAt(3, 12, 3, 22)], "src/promo-form.tsx": [rangeAt(10, 17, 10, 21), rangeAt(11, 72, 11, 74)] }
const FORM = "src/promo-form.tsx#component@4:1"
const SUBMIT = "src/promo-form.tsx#function@7:3"
const SUBMIT_EVENT = "src/promo-form.tsx#render-event@11:16"
const CHANGE_EVENT = "src/promo-form.tsx#render-event@11:48"
const HOOK = "src/use-apply-promo.ts#hook@3:1"
const FETCH_PROMO = "src/promo.ts#function@1:1"

const handlersBand = (): NonNullable<ReturnType<typeof buildTrace>["diagram"]> => {
  const diagram = buildTrace(createSegment({ traceDiagram: presentDiagramOf(HANDLERS, HANDLERS_CHANGE) }), "", [], createViewContext()).diagram
  if (diagram === null) throw new Error("The fixture has no band.")
  return diagram
}

const handlerNodeOf = (nodeId: string): TraceNodeView | undefined => listNodeViews(handlersBand().nodes).find((node) => node.id === nodeId)

const handlerRowsOf = (nodeId: string): [string, string[]][] => (handlerNodeOf(nodeId)?.blockLists ?? []).map(({ label, blocks }) => [label, blocks.map((block) => block.name)])

const handlerEdgesBetween = (from: string, to: string): [string | null, string | null][] =>
  handlersBand().edges.filter((edge) => edge.from === from && edge.to === to).map(({ fromRowId, toRowId }) => [fromRowId, toRowId])

describe("the rows of a node that holds nodes of its own", () => {
  it("has no node for a function an event of the node is handed: it is the trigger of that event, and its calls are rows of the event", () => {
    expect(handlerRowsOf(FORM)).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Calls", ["shown"]]])
    expect(handlerNodeOf(FORM)?.triggerLabels.map((trigger) => trigger.name)).toStrictEqual(["form.onSubmit", "input.onChange"])
    expect(handlerNodeOf(SUBMIT)).toBeUndefined()
    expect(handlerRowsOf(SUBMIT_EVENT)).toStrictEqual([["Calls", ["mutate()"]]])
  })

  it("gives the trigger of an event handed a function the lines of that function too", () => {
    expect(handlerNodeOf(FORM)?.triggerLabels.find((trigger) => trigger.id === SUBMIT_EVENT)?.lines).toStrictEqual([[7, 9], [11, 11]])
  })

  it("lists no step for a condition of a plain function, only its arguments and its returns", () => {
    expect(handlerRowsOf(FETCH_PROMO)).toStrictEqual([["Args", ["code"]], ["Returns", ["return", "return"]]])
  })

  it("lists a value kept from other code as a call, marked as changed when a block folded into it is", () => {
    const calls = handlerNodeOf(FORM)?.blockLists.find((list) => list.kind === "call")?.blocks ?? []

    expect(calls.map(({ name, change }) => [name, change])).toStrictEqual([["shown", "modified"]])
  })

  it("has no row for changed markup: the node of the component holds its markup as one unit, and is marked as changed", () => {
    const traceDiagram = presentDiagramOf(HANDLERS, { ...HANDLERS_CHANGE, "src/promo-form.tsx": [rangeAt(11, 10, 11, 15), rangeAt(11, 34, 11, 40)] })
    const form = listNodeViews(buildTrace(createSegment({ traceDiagram }), "", [], createViewContext()).diagram?.nodes ?? []).find((node) => node.id === FORM)

    expect(traceDiagram.traceNodes.find((node) => node.id === FORM)?.diffCodeBlocks.map((block) => block.type)).toContain("render")
    expect(form?.blockLists.map(({ label, blocks }) => [label, blocks.map((block) => block.name)])).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Calls", ["shown"]]])
    expect(form?.change).toBe("modified")
  })

  it("lists the calls and the returns of a hook as rows of its one node, with a call inside a callback it hands a library", () => {
    expect(handlerRowsOf(HOOK)).toStrictEqual([["Calls", ["fetchPromo()"]], ["Returns", ["return"]]])
    expect(listNodeViews(handlersBand().nodes).filter((node) => node.shortPath === "src/use-apply-promo.ts").map((node) => node.id)).toStrictEqual([HOOK])
  })

  it("does not list the function written in place of an event, and marks the trigger label and the node of that event when it changed", () => {
    expect(handlerNodeOf(CHANGE_EVENT)?.blockLists).toStrictEqual([])
    expect(handlerNodeOf(CHANGE_EVENT)?.change).toBe("modified")
    expect(handlerNodeOf(FORM)?.triggerLabels.map(({ id, change }) => [id, change])).toStrictEqual([[SUBMIT_EVENT, null], [CHANGE_EVENT, "modified"]])
  })
})

describe("the edges of a node that holds nodes of its own", () => {
  it("joins the row of a block that is a node of its own to the head of that node", () => {
    expect(handlerEdgesBetween(FORM, SUBMIT_EVENT)).toStrictEqual([[SUBMIT_EVENT, null]])
  })

  it("has no node for the call that makes a state: the line to what its callback runs leaves the row of the call in that callback", () => {
    const files = { ...HANDLERS, "src/use-apply-promo.ts": HANDLERS["src/use-apply-promo.ts"].replace("const applyPromo = useMutation", "const [applyPromo] = useState").replace("@tanstack/react-query", "react").replace("useMutation }", "useState }") }
    const band = buildTrace(createSegment({ traceDiagram: presentDiagramOf(files, HANDLERS_CHANGE) }), "", [], createViewContext()).diagram
    const hook = listNodeViews(band?.nodes ?? []).find((node) => node.id === HOOK)
    const leaving = (band?.edges ?? []).filter((edge) => edge.from === HOOK)

    expect(hook?.blockLists.map(({ label, blocks }) => [label, blocks.map((block) => block.name)])).toStrictEqual([["Calls", ["fetchPromo()"]], ["Returns", ["return"]]])
    expect(listNodeViews(band?.nodes ?? []).map((node) => node.type)).not.toContain("component-effect")
    expect(leaving.map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual([[FETCH_PROMO, "src/use-apply-promo.ts#call@4:78@4:78"]])
  })

  it("joins the row of a step to the node the step leads to, through the value of the component it calls", () => {
    expect(handlerEdgesBetween(FORM, HOOK)).toStrictEqual([["src/promo-form.tsx#external-value@6:3", null]])
    expect(handlerEdgesBetween(FORM, FETCH_PROMO)).toStrictEqual([["src/promo-form.tsx#external-value@10:3", null]])
  })

  it("leaves the row of a call of the function an event is handed for the node that call leads to", () => {
    expect(handlerEdgesBetween(SUBMIT_EVENT, HOOK)).toStrictEqual([["src/promo-form.tsx#call@8:17@8:17", null]])
  })

  it("gives every edge a line with an id of its own", () => {
    const edges = handlersBand().edges

    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
  })
})

const STORE_FILES = {
  "src/store.ts": codeOf(
    "import { create } from \"zustand\"",
    "export const useCartStore = create((set) => ({",
    "  items: [],",
    "  addItem: (product) => {",
    "    set((state) => {",
    "      const existing = state.items.find((item) => item.product.id === product.id)",
    "      if (!existing) return { items: [...state.items, { product, quantity: 1 }] }",
    "      return {",
    "        items: state.items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item),",
    "      }",
    "    })",
    "  },",
    "}))",
  ),
  "src/add-button.tsx": codeOf(
    "import { useCartStore } from \"./store\"",
    "export const AddButton = ({ product }) => {",
    "  const addItem = useCartStore((state) => state.addItem)",
    "  return <button onClick={() => addItem(product)}>Add</button>",
    "}",
  ),
}

const bandOf = (files: Parameters<typeof presentDiagramOf>[0], diffs: Parameters<typeof presentDiagramOf>[1]): NonNullable<ReturnType<typeof buildTrace>["diagram"]> => {
  const diagram = buildTrace(createSegment({ traceDiagram: presentDiagramOf(files, diffs) }), "", [], createViewContext()).diagram
  if (diagram === null) throw new Error("The fixture has no band.")
  return diagram
}

type Row = TraceNodeView["blockLists"][number]["blocks"][number]

const rowsOf = (band: ReturnType<typeof bandOf>, nodeId: string): Row[] => {
  const node = listNodeViews(band.nodes).find((one) => one.id === nodeId)
  const rowById = new Map([...(node?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(node?.triggerLabels ?? [])].map((row) => [row.id, row] as const))
  return (node?.rowGroups ?? []).flatMap(({ rowIds }) => rowIds.flatMap((rowId) => rowById.get(rowId) ?? []))
}

describe("the rows of a store in the trace band", () => {
  it("lists an action of a store as a row of the store, and folds what is written inside the action into its row", () => {
    const band = bandOf(STORE_FILES, { "src/store.ts": [rangeAt(5, 1, 11, 10)] })
    const namedRows = (nodeId: string): [string, string | null][] => rowsOf(band, nodeId).map(({ name, change }) => [name, change])

    expect(listNodeViews(band.nodes).map((node) => [node.id, node.name])).toStrictEqual([
      ["src/add-button.tsx#component@2:1", "AddButton"],
      ["src/store.ts#state@2:1", "useCartStore"],
      ["src/add-button.tsx#render-event@4:18", "button.onClick"],
    ])
    expect(namedRows("src/store.ts#state@2:1")).toStrictEqual([["addItem", "modified"]])
  })
})

const CALLER_FILES = {
  "src/users.ts": codeOf("export const getUsers = () => {", "  return [1]", "}", "export const saveUser = (user) => {", "  return user", "}", "export const useUsers = () => {", "  return [1]", "}"),
  "src/rename.ts": codeOf(
    "import { getUsers, saveUser } from \"./users\"",
    "export const renameUser = (param, other) => {",
    "  const users = getUsers()",
    "  const first = param.id",
    "  if (!users) throw new Error(\"no user\")",
    "  saveUser(first)",
    "  return other",
    "}",
  ),
  "src/list.tsx": codeOf(
    "import { useState } from \"react\"",
    "import { getUsers, saveUser, useUsers } from \"./users\"",
    "export const List = ({ title }) => {",
    "  const [open, setOpen] = useState(false)",
    "  const users = getUsers()",
    "  const hooked = useUsers()",
    "  const save = (event) => {",
    "    event.preventDefault()",
    "    saveUser(users)",
    "  }",
    "  if (open) saveUser(title)",
    "  return <form onSubmit={save}>{title}{hooked}</form>",
    "}",
  ),
}
const CALLEE_CHANGE = { "src/users.ts": [rangeAt(2, 3, 2, 13), rangeAt(5, 3, 5, 14), rangeAt(8, 3, 8, 13)] }
const RENAME_USER = "src/rename.ts#function@2:1"
const LIST = "src/list.tsx#component@3:1"
const LIST_SUBMIT = "src/list.tsx#render-event@12:16"

const groupsOf = (band: ReturnType<typeof bandOf>, nodeId: string): [string | null, string[]][] => {
  const node = listNodeViews(band.nodes).find((one) => one.id === nodeId)
  const nameById = new Map([...(node?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(node?.triggerLabels ?? [])].map((row) => [row.id, row.name] as const))
  return (node?.rowGroups ?? []).map(({ label, rowIds }) => [label, rowIds.map((rowId) => nameById.get(rowId) ?? rowId)])
}

const calleeCardsOf = (band: ReturnType<typeof bandOf>, nodeId: string): [string, string, string[]][] => {
  const node = listNodeViews(band.nodes).find((one) => one.id === nodeId)
  const nameById = new Map((node?.blockLists ?? []).flatMap(({ blocks }) => blocks).map((row) => [row.id, row.name] as const))
  return (node?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, typeLabel, rowIds }) => [name, typeLabel, rowIds.map((rowId) => nameById.get(rowId) ?? rowId)])
}

describe("the rows of a card", () => {
  it("gives a call into other code a row in the card of what it calls though its own line did not change, and joins the line to that code to it", () => {
    const band = bandOf(CALLER_FILES, CALLEE_CHANGE)

    expect(groupsOf(band, RENAME_USER)).toStrictEqual([["Arguments", ["param", "other"]], ["External calls", []], ["Returns and raises", ["Throw :5", "return"]]])
    expect(calleeCardsOf(band, RENAME_USER)).toStrictEqual([["getUsers", "Function", ["getUsers()"]], ["saveUser", "Function", ["saveUser()"]]])
    expect(band.edges.filter((edge) => edge.from === RENAME_USER).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual(
      expect.arrayContaining([
        ["src/users.ts#function@1:1", "src/rename.ts#external-value@3:3@3:17"],
        ["src/users.ts#function@4:1", "src/rename.ts#call@6:3@6:3"],
      ]),
    )
  })

  it("groups the rows of a component: arguments, state, a group per kind of call, its triggers, then its steps", () => {
    expect(groupsOf(bandOf(CALLER_FILES, { ...CALLEE_CHANGE, "src/list.tsx": [rangeAt(11, 3, 11, 12)] }), LIST)).toStrictEqual([
      ["Hooks", ["useUsers"]],
      ["Calls", ["users"]],
      ["Triggers", ["form.onSubmit"]],
      ["Steps", ["Condition :11"]],
    ])
  })

  it("gives an event the arguments and the calls of the function it is handed, and no row for a call into the language", () => {
    const band = bandOf(CALLER_FILES, { ...CALLEE_CHANGE, "src/list.tsx": [rangeAt(7, 17, 7, 22), rangeAt(8, 5, 8, 27)] })

    expect(groupsOf(band, LIST_SUBMIT)).toStrictEqual([["Arguments", ["event"]], ["External calls", []]])
    expect(calleeCardsOf(band, LIST_SUBMIT)).toStrictEqual([["saveUser", "Function", ["saveUser()"]]])
    expect(band.edges.filter((edge) => edge.from === LIST_SUBMIT).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual(
      expect.arrayContaining([["src/users.ts#function@4:1", "src/list.tsx#call@9:5@9:5"]]),
    )
  })
})
