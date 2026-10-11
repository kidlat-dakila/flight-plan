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

describe("the edges of the journey band", () => {
  it("names the row of the block an edge leaves, one edge per row, and no row where it leaves or reaches the head of a node", () => {
    const segment = createSegment({ journey: presentDiagramOf(FILES, PROMO_CHANGE) })
    const edges = buildJourney(segment, "", [], createViewContext()).diagram?.edges ?? []

    expect(edges.map(({ from, to, fromRowId, toRowId }) => [from, fromRowId, to, toRowId])).toStrictEqual([
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#external-value@6:3", "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", null, "src/use-apply-promo.ts#hook@3:1", null],
      ["src/promo-form.tsx#render-event@9:16", null, "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#effect-callback@8:13", null, "src/promo.ts#function@1:1", null],
      ["src/use-apply-promo.ts#effect-callback@4:24", null, "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#derived@7:3", "src/promo.ts#function@1:1", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#component-effect@8:3", null],
      ["src/promo-form.tsx#component@4:1", "src/promo-form.tsx#render-event@9:16", "src/promo-form.tsx#render-event@9:16", null],
      ["src/promo-form.tsx#component-effect@8:3", "src/promo-form.tsx#effect-callback@8:13", "src/promo-form.tsx#effect-callback@8:13", null],
      ["src/use-apply-promo.ts#hook@3:1", "src/use-apply-promo.ts#component-effect@4:10", "src/use-apply-promo.ts#component-effect@4:10", null],
      ["src/use-apply-promo.ts#component-effect@4:10", "src/use-apply-promo.ts#effect-callback@4:24", "src/use-apply-promo.ts#effect-callback@4:24", null],
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
      { kind: "argument", label: "Args", blocks: [{ id: "src/promo.ts#root-argument-value@2:10", name: "code.trim", change: "modified" }] },
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
const MUTATION = "src/use-apply-promo.ts#component-effect@4:22"
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
  it("lists a function of a node as a step of it, after the other kinds, and leaves out what is inside that function", () => {
    expect(handlerRowsOf(FORM)).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Steps", ["submit", "Condition :10"]]])
    expect(handlerNodeOf(SUBMIT)).toBeUndefined()
  })

  it("lists a condition of a plain function as a step of it", () => {
    expect(handlerRowsOf(FETCH_PROMO)).toStrictEqual([["Args", ["code.trim"]], ["Steps", ["Condition :2"]]])
  })

  it("lists a block with a change that is none of the other kinds as a step, marked as changed", () => {
    const steps = handlerNodeOf(FORM)?.blockLists.find((list) => list.kind === "step")?.blocks ?? []

    expect(steps.map(({ name, change }) => [name, change])).toStrictEqual([["submit", null], ["Condition :10", "modified"]])
  })

  it("has no row for changed markup: the node of the component holds its markup as one unit, and is marked as changed", () => {
    const journey = presentDiagramOf(HANDLERS, { ...HANDLERS_CHANGE, "src/promo-form.tsx": [rangeAt(11, 10, 11, 15), rangeAt(11, 34, 11, 40)] })
    const form = listNodeViews(buildJourney(createSegment({ journey }), "", [], createViewContext()).diagram?.nodes ?? []).find((node) => node.id === FORM)

    expect(journey.journeyNodes.find((node) => node.id === FORM)?.diffCodeBlocks.map((block) => block.type)).toContain("render")
    expect(form?.blockLists.map(({ label, blocks }) => [label, blocks.map((block) => block.name)])).toStrictEqual([["Hooks", ["useApplyPromo"]], ["Steps", ["submit"]]])
    expect(form?.change).toBe("modified")
  })

  it("lists an effect that is a node of its own under the effects of the node around it, named after what it calls", () => {
    expect(handlerRowsOf(HOOK)).toStrictEqual([["Effects", ["useMutation"]]])
    expect(handlerNodeOf(MUTATION)?.sublabel).toBe("src/use-apply-promo.ts")
    expect(handlerNodeOf(MUTATION)?.label).toBe("useMutation")
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
    expect(handlerEdgesBetween(HOOK, MUTATION)).toStrictEqual([[MUTATION, null]])
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
      ["src/use-apply-promo.ts#code-event@4:59", "src/use-apply-promo.ts#code-event@4:59"],
    ])
  })

  it("joins the row of a step to the node the step leads to, through the value of the component it calls", () => {
    expect(handlerEdgesBetween(FORM, HOOK)).toStrictEqual([["src/promo-form.tsx#external-value@6:3", null], [SUBMIT, null]])
    expect(handlerEdgesBetween(FORM, FETCH_PROMO)).toStrictEqual([["src/promo-form.tsx#condition@10:17", null]])
  })

  it("leaves the head of an event for the node its function leads to", () => {
    expect(handlerEdgesBetween(SUBMIT_EVENT, HOOK)).toStrictEqual([[null, null]])
  })

  it("gives every edge a line with an id of its own", () => {
    const edges = handlersBand().edges

    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
  })
})
