import { createSegment, createViewContext } from "@/__tests__/review-fixture"
import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { buildJourney } from "@/journey/build"
import { presentDiagramOf } from "@/journey-flow-diagram/__tests__/diagram-fixture"
import type { JourneyNodeView } from "@flightplan/configurations"

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

const listNodeViews = (nodes: readonly JourneyNodeView[]): JourneyNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewsOf = (): JourneyNodeView[] => {
  const segment = createSegment({ journey: presentDiagramOf(FILES, PROMO_CHANGE) })
  return listNodeViews(buildJourney(segment, "", [], createViewContext()).diagram?.nodes ?? [])
}

const blockListsOf = (nodeId: string): [string, string, string[]][] =>
  (nodeViewsOf().find((node) => node.id === nodeId)?.blockLists ?? []).map(({ kind, label, blocks }) => [kind, label, blocks.map((block) => block.name)])

describe("the head of a node of the journey band", () => {
  it("gives the name of the code and its path down to the last two folders", () => {
    const deepPath = "apps/shop/src/routes/orders/index.ts"
    const segment = createSegment({ journey: presentDiagramOf({ [deepPath]: PROMO }, { [deepPath]: [rangeAt(2, 10, 2, 20)] }) })
    const [node] = buildJourney(segment, "", [], createViewContext()).diagram?.nodes ?? []

    expect([node.name, node.shortPath]).toStrictEqual(["fetchPromo", "routes/orders/index.ts"])
  })
})

describe("the rows of a node of the journey band", () => {
  it("gives each listed block and each trigger label the lines of its block", () => {
    const form = nodeViewsOf().find((node) => node.name === "PromoForm")
    const rows = [...(form?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(form?.triggerLabels ?? [])]

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.lines.length > 0 && row.lines.every(([lineStart, lineEnd]) => lineStart >= 4 && lineEnd <= 10))).toBe(true)
    expect(form?.triggerLabels.find((trigger) => trigger.name === "form.onSubmit")?.lines).toStrictEqual([[9, 9]])
  })
})

describe("the block labels of a node of the journey band", () => {
  it("gives a listed block the label written for it, and the name of its code as a draft until then", () => {
    const journey = presentDiagramOf(FILES, PROMO_CHANGE)
    const [written] = journey.journeyNodes.flatMap((node) => node.blockLabels)
    const labelled = {
      ...journey,
      journeyNodes: journey.journeyNodes.map((node) => ({ ...node, blockLabels: node.blockLabels.map((listed) => (listed === written ? { ...listed, label: "Holds the typed code" } : listed)) })),
    }
    const views = listNodeViews(buildJourney(createSegment({ journey: labelled }), "", [], createViewContext()).diagram?.nodes ?? [])
    const steps = views.flatMap((node) => node.blockLists).flatMap(({ blocks }) => blocks)

    expect(journey.journeyNodes.flatMap((node) => node.blockLabels).every((listed) => listed.label === null)).toBe(true)
    expect(steps.filter((block) => !block.isDraft).map((block) => [block.id, block.label])).toStrictEqual([[written.codeBlock.id, "Holds the typed code"]])
    expect(steps.filter((block) => block.isDraft).every((block) => block.label === block.name)).toBe(true)
  })
})

describe("the edges of the journey band", () => {
  it("names the row of the block an edge leaves, one edge per row, and no row where it leaves or reaches the head of a node", () => {
    const segment = createSegment({ journey: presentDiagramOf(FILES, PROMO_CHANGE) })
    const edges = buildJourney(segment, "", [], createViewContext()).diagram?.edges ?? []

    expect(edges.map(({ from, to, fromRowId, toRowId }) => [from, fromRowId, to, toRowId])).toStrictEqual([
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#external-value@6:3", "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#call@9:34", "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#call@9:48", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#effect-callback@8:13", "src/promo-form.tsx#call@8:21", "src/promo.ts#function@1:1", null],
      ["src/use-apply-promo.ts#hook@3:1", "src/use-apply-promo.ts#component-effect@4:10", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#derived@7:3", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#component-effect@8:3", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#render-event@9:16", null],
      ["src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#effect-callback@8:13", "src/promo-form.tsx#effect-callback@8:13", null],
    ])
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
  })
})

describe("the block lists of a node of the journey band", () => {
  it("lists the state, the hooks and the effects of a node that are on a chain, each kind once, and leaves out the state no chain reads on the way to a change", () => {
    expect(blockListsOf("src/promo-form.tsx#component@4:1")).toStrictEqual([
      ["state", "State", ["shown"]],
      ["hook", "Hooks", ["useApplyPromo"]],
      ["effect", "Effects", ["useEffect"]],
    ])
  })

  it("names an effect once, without the callbacks inside it", () => {
    expect(blockListsOf("src/use-apply-promo.ts#hook@3:1")).toStrictEqual([["effect", "Effects", ["useMutation"]]])
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
    const [summary] = listNodeViews(buildJourney(createSegment({ journey: diagram }), "", [], createViewContext()).diagram?.nodes ?? [])

    expect(diagram.journeyNodes[0].codeBlocks.map((block) => block.type)).not.toContain("state")
    expect(summary.blockLists.map(({ kind, blocks }) => [kind, blocks.map((block) => block.name)])).toStrictEqual([["state", ["total"]], ["effect", ["poll"]]])
  })

  it("names a member read from an argument after the argument, and marks a changed block", () => {
    const promo = nodeViewsOf().find((node) => node.id === "src/promo.ts#function@1:1")

    expect(promo?.blockLists).toStrictEqual([
      { kind: "argument", label: "Args", blocks: [{ id: "src/promo.ts#root-argument-value@2:10", name: "code.trim", label: "code.trim", isDraft: true, change: "modified", lines: [[2, 2]] }] },
    ])
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

const handlersBand = (): NonNullable<ReturnType<typeof buildJourney>["diagram"]> => {
  const diagram = buildJourney(createSegment({ journey: presentDiagramOf(HANDLERS, HANDLERS_CHANGE) }), "", [], createViewContext()).diagram
  if (diagram === null) throw new Error("The fixture has no band.")
  return diagram
}

const handlerNodeOf = (nodeId: string): JourneyNodeView | undefined => listNodeViews(handlersBand().nodes).find((node) => node.id === nodeId)

const handlerRowsOf = (nodeId: string): [string, string[]][] => (handlerNodeOf(nodeId)?.blockLists ?? []).map(({ label, blocks }) => [label, blocks.map((block) => block.name)])

const handlerEdgesBetween = (from: string, to: string): [string | null, string | null][] =>
  handlersBand().edges.filter((edge) => edge.from === from && edge.to === to).map(({ fromRowId, toRowId }) => [fromRowId, toRowId])

describe("the rows of a node that holds nodes of its own", () => {
  it("has no step for a function an event of the node is handed: it is the trigger of that event, and its steps are rows of the event", () => {
    expect(handlerRowsOf(FORM)).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Calls", ["shown"]]])
    expect(handlerNodeOf(FORM)?.triggerLabels.map((trigger) => trigger.name)).toStrictEqual(["form.onSubmit", "input.onChange"])
    expect(handlerNodeOf(SUBMIT)).toBeUndefined()
    expect(handlerRowsOf(SUBMIT_EVENT)).toStrictEqual([["Steps", ["Condition :8"]]])
  })

  it("gives the trigger of an event handed a function the lines of that function too", () => {
    expect(handlerNodeOf(FORM)?.triggerLabels.find((trigger) => trigger.id === SUBMIT_EVENT)?.lines).toStrictEqual([[7, 9], [11, 11]])
  })

  it("lists a condition of a plain function as a step of it", () => {
    expect(handlerRowsOf(FETCH_PROMO)).toStrictEqual([["Args", ["code.trim"]], ["Steps", ["Condition :2"]]])
  })

  it("lists a value kept from other code as a call, marked as changed when a block folded into it is", () => {
    const calls = handlerNodeOf(FORM)?.blockLists.find((list) => list.kind === "call")?.blocks ?? []

    expect(calls.map(({ name, change }) => [name, change])).toStrictEqual([["shown", "modified"]])
  })

  it("has no row for changed markup: the node of the component holds its markup as one unit, and is marked as changed", () => {
    const journey = presentDiagramOf(HANDLERS, { ...HANDLERS_CHANGE, "src/promo-form.tsx": [rangeAt(11, 10, 11, 15), rangeAt(11, 34, 11, 40)] })
    const form = listNodeViews(buildJourney(createSegment({ journey }), "", [], createViewContext()).diagram?.nodes ?? []).find((node) => node.id === FORM)

    expect(journey.journeyNodes.find((node) => node.id === FORM)?.diffCodeBlocks.map((block) => block.type)).toContain("render")
    expect(form?.blockLists.map(({ label, blocks }) => [label, blocks.map((block) => block.name)])).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Calls", ["shown"]]])
    expect(form?.change).toBe("modified")
  })

  it("lists the effects and the calls inside a root block that is no component as rows of its one node", () => {
    expect(handlerRowsOf(HOOK)).toStrictEqual([["Effects", ["mutationFn"]], ["Calls", ["fetchPromo"]]])
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

  it("has no node for the call that makes a state: the line to what its callback runs leaves the row of that state", () => {
    const files = { ...HANDLERS, "src/use-apply-promo.ts": HANDLERS["src/use-apply-promo.ts"].replace("const applyPromo = useMutation", "const [applyPromo] = useState").replace("@tanstack/react-query", "react").replace("useMutation }", "useState }") }
    const band = buildJourney(createSegment({ journey: presentDiagramOf(files, HANDLERS_CHANGE) }), "", [], createViewContext()).diagram
    const hook = listNodeViews(band?.nodes ?? []).find((node) => node.id === HOOK)
    const leaving = (band?.edges ?? []).filter((edge) => edge.from === HOOK)

    expect(hook?.blockLists.map(({ label, blocks }) => [label, blocks.map((block) => block.name)])).toStrictEqual([["State", ["applyPromo"]]])
    expect(listNodeViews(band?.nodes ?? []).map((node) => node.type)).not.toContain("component-effect")
    expect(leaving.map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual([
      [FETCH_PROMO, "src/use-apply-promo.ts#state@4:3"],
      [FETCH_PROMO, "src/use-apply-promo.ts#code-event@4:59"],
    ])
  })

  it("joins the row of a step to the node the step leads to, through the value of the component it calls", () => {
    expect(handlerEdgesBetween(FORM, HOOK)).toStrictEqual([["src/promo-form.tsx#external-value@6:3", null]])
    expect(handlerEdgesBetween(FORM, FETCH_PROMO)).toStrictEqual([["src/promo-form.tsx#external-value@10:3", null]])
  })

  it("leaves the row of a step of the function an event is handed for the node that step leads to", () => {
    expect(handlerEdgesBetween(SUBMIT_EVENT, HOOK)).toStrictEqual([["src/promo-form.tsx#condition@8:5", null]])
  })

  it("gives every edge a line with an id of its own", () => {
    const edges = handlersBand().edges

    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
  })
})

const RENAME_FILES = {
  "src/users.ts": codeOf("export const getUsers = () => [{ id: 1, name: \"a\" }]", "export const saveUser = (user) => user"),
  "src/rename.ts": codeOf(
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
  ),
}
const RENAME = "src/rename.ts#function@2:1"
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
}
const HELPER_FILES = {
  "src/helper.ts": codeOf("export const helper = (count) => {", "  return count + 1", "}"),
  "src/totals.ts": codeOf(
    "import { helper } from \"./helper\"",
    "export const totals = () => {",
    "  const first = 1",
    "  const second = { a: first, b: { c: 2 } }",
    "  const third = [1].map((count) => helper(count))",
    "  return third",
    "}",
  ),
}
const TOTALS = "src/totals.ts#function@2:1"

const bandOf = (files: Parameters<typeof presentDiagramOf>[0], diffs: Parameters<typeof presentDiagramOf>[1]): NonNullable<ReturnType<typeof buildJourney>["diagram"]> => {
  const diagram = buildJourney(createSegment({ journey: presentDiagramOf(files, diffs) }), "", [], createViewContext()).diagram
  if (diagram === null) throw new Error("The fixture has no band.")
  return diagram
}

type Row = JourneyNodeView["blockLists"][number]["blocks"][number]

const rowsOf = (band: ReturnType<typeof bandOf>, nodeId: string): Row[] => {
  const node = listNodeViews(band.nodes).find((one) => one.id === nodeId)
  const rowById = new Map([...(node?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(node?.triggerLabels ?? [])].map((row) => [row.id, row] as const))
  return (node?.rowGroups ?? []).flatMap(({ rowIds }) => rowIds.flatMap((rowId) => rowById.get(rowId) ?? []))
}

const stepsOf = rowsOf

describe("the steps of a node of the journey band", () => {
  it("lists the arguments first and then every row in the order it is written: the statements that follow each other as one step, and a block, a call out and a throw as a row of its own", () => {
    const steps = stepsOf(bandOf(RENAME_FILES, { "src/rename.ts": [rangeAt(3, 1, 14, 80)] }), RENAME)

    expect(steps.map(({ name, lines }) => [name, lines])).toStrictEqual([
      ["param.id", [[5, 5]]],
      ["param.name", [[6, 6]]],
      ["users", [[3, 3]]],
      ["Condition :4", [[4, 4]]],
      ["user, stored", [[5, 7]]],
      ["Loop :8", [[8, 8]]],
      ["saveUser", [[8, 8]]],
      ["Try :9", [[9, 13]]],
      ["saveUser", [[10, 10]]],
      ["Throw :12", [[12, 12]]],
      ["Function :14", [[14, 14]]],
    ])
  })

  it("lists a value at the top level of its file that is not exported as a step of the node that reads it, marked as changed with the lines of its declaration", () => {
    const orders = codeOf("const ORDERS_KEY = [\"orders\"]", "export const loadOrders = () => {", "  return ORDERS_KEY", "}")
    const steps = stepsOf(bandOf({ "src/orders.ts": orders }, { "src/orders.ts": [rangeAt(1, 20, 1, 29)] }), "src/orders.ts#function@2:1")

    expect(steps.map(({ name, change, lines }) => [name, change, lines])).toStrictEqual([["ORDERS_KEY", "modified", [[1, 1]]]])
  })

  it("names a folded step after its first block, so one label is written for it", () => {
    const steps = stepsOf(bandOf(RENAME_FILES, { "src/rename.ts": [rangeAt(3, 1, 14, 80)] }), RENAME)

    expect(steps.find((step) => step.name === "user, stored")?.id).toBe("src/rename.ts#variable@5:3")
  })

  it("lists a function that is a node of its own as a row of the store around it, and folds what is written inside a callback of that function into its row", () => {
    const band = bandOf(STORE_FILES, { "src/store.ts": [rangeAt(5, 1, 11, 10)] })
    const namedRows = (nodeId: string): [string, string | null][] => stepsOf(band, nodeId).map(({ name, change }) => [name, change])

    expect(listNodeViews(band.nodes).map((node) => [node.id, node.name])).toStrictEqual([["src/store.ts#state@2:1", "useCartStore"], ["src/store.ts#function@4:3", "addItem"]])
    expect(namedRows("src/store.ts#state@2:1")).toStrictEqual([["addItem", "modified"]])
    expect(namedRows("src/store.ts#function@4:3")).toStrictEqual([["state", "modified"], ["set", "modified"]])
  })

  it("marks a step as changed when a block folded into it is", () => {
    const steps = stepsOf(bandOf(HELPER_FILES, { "src/totals.ts": [rangeAt(4, 34, 4, 38)], "src/helper.ts": [rangeAt(2, 10, 2, 19)] }), TOTALS)

    expect(steps.map(({ name, change }) => [name, change])).toContainEqual(["second", "modified"])
  })

  it("names a step of several statements after the first two, and counts the others", () => {
    const files = { "src/sum.ts": codeOf("export const sum = () => {", "  const one = 1", "  const two = 2", "  const three = 3", "  const four = 4", "  return one + two + three + four", "}") }
    const steps = stepsOf(bandOf(files, { "src/sum.ts": [rangeAt(2, 1, 5, 20)] }), "src/sum.ts#function@1:1")

    expect(steps.map(({ name, lines }) => [name, lines])).toStrictEqual([["one, two +2", [[2, 5]]]])
  })

  it("gives a statement that leads to another node a step of its own, and joins the line from a block folded into it to that step", () => {
    const band = bandOf(HELPER_FILES, { "src/totals.ts": [rangeAt(3, 1, 5, 60)], "src/helper.ts": [rangeAt(2, 10, 2, 19)] })

    expect(stepsOf(band, TOTALS).map((step) => step.name)).toStrictEqual(["first, second", "third"])
    expect(band.edges.filter((edge) => edge.from === TOTALS).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual([["src/helper.ts#function@1:1", "src/totals.ts#external-value@5:3"]])
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

describe("the rows of a card", () => {
  it("gives a call into other code on the way to a change a row though its own line did not change, and joins the line to that code to it", () => {
    const band = bandOf(CALLER_FILES, CALLEE_CHANGE)

    expect(groupsOf(band, RENAME_USER)).toStrictEqual([[null, ["users", "Condition :5", "saveUser"]]])
    expect(band.edges.filter((edge) => edge.from === RENAME_USER).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual(
      expect.arrayContaining([
        ["src/users.ts#function@1:1", "src/rename.ts#external-value@3:3"],
        ["src/users.ts#function@4:1", "src/rename.ts#call@6:3"],
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

  it("lists the rows of any other card in the order they are written, with no group, after the arguments of its function", () => {
    const band = bandOf(CALLER_FILES, { ...CALLEE_CHANGE, "src/list.tsx": [rangeAt(7, 17, 7, 22), rangeAt(8, 5, 8, 27)] })

    expect(groupsOf(band, LIST_SUBMIT)).toStrictEqual([[null, ["event", "event.preventDefault", "saveUser"]]])
    expect(band.edges.filter((edge) => edge.from === LIST_SUBMIT).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual(
      expect.arrayContaining([["src/users.ts#function@4:1", "src/list.tsx#call@9:5"]]),
    )
  })
})
