import { DRAFT_TRACE_NODE, DRAFT_SEGMENT, draftTraceOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { amendTrace } from "@/procedures/update-nodes/utils/amend-trace"

const TRACE = draftTraceOf([
  {
    ...DRAFT_TRACE_NODE,
    triggers: [{ codeBlockId: "click", type: "render-event", name: "onClick", label: null }],
    listedBlocks: [
      { codeBlockId: "held", type: "state", name: "held", label: null },
      { codeBlockId: "round", type: "function", name: "round", label: null },
    ],
  },
])
const SEGMENT = { ...DRAFT_SEGMENT, traceDiagram: TRACE }
const CALL_AT = { line: 7, column: 3 }
const RETURN_AT = { line: 8, column: 5 }
const FUNCTION_CARD_SEGMENT = {
  ...DRAFT_SEGMENT,
  traceDiagram: draftTraceOf([
    {
      ...DRAFT_TRACE_NODE,
      listedBlocks: [
        { codeBlockId: "subtotal", type: "function", name: "subtotal", label: null, at: CALL_AT },
        { codeBlockId: "subtotal", type: "function", name: "subtotal", label: null, at: RETURN_AT },
        { codeBlockId: "empty", type: "throw", name: "empty", label: null },
      ],
    },
  ]),
}

const RETURN_GROUP_AT = { line: 9, column: 3 }
const COMPONENT_CARD_SEGMENT = {
  ...DRAFT_SEGMENT,
  traceDiagram: draftTraceOf([
    {
      ...DRAFT_TRACE_NODE,
      type: "component",
      listedBlocks: [
        { codeBlockId: "subtotal", type: "component", name: "Subtotal", label: null, at: RETURN_GROUP_AT },
        { codeBlockId: "lines", type: "render-loop", name: "map", label: null },
        { codeBlockId: "effect", type: "component-effect", name: "useEffect", label: null },
      ],
    },
  ]),
}

const labelsOf = (outcome: ReturnType<typeof amendTrace>): (string | null)[][] => {
  const [node] = outcome.kind === "amended" ? (outcome.segments[0].traceDiagram?.traceNodes ?? []) : []
  return [node.triggerLabels.map((trigger) => trigger.label), node.blockLabels.map((listed) => listed.label)]
}

describe("amendTrace", () => {
  it("writes the label of a listed block by its code block id, and leaves the others as they were", () => {
    const outcome = amendTrace([SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "round", label: "Rounds to the nearest cent" }] }])

    expect(labelsOf(outcome)).toStrictEqual([[null], [null, "Rounds to the nearest cent"]])
  })

  it("writes the label of a trigger by its code block id", () => {
    const outcome = amendTrace([SEGMENT], [{ id: DRAFT_TRACE_NODE.id, triggerLabels: [{ codeBlockId: "click", label: "A shopper clicks Round" }] }])

    expect(labelsOf(outcome)).toStrictEqual([["A shopper clicks Round"], [null, null]])
  })

  it("refuses a block label for a block the node does not list", () => {
    const outcome = amendTrace([SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "click", label: "A trigger, not a listed block" }] }])

    expect(outcome.kind === "refused" ? outcome.message : "").toContain("there is none for `click` on `j-subtotal`")
  })

  it("writes the label of a row by its code block id and its place, apart from a row of the same block at another place", () => {
    const outcome = amendTrace([FUNCTION_CARD_SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "subtotal", at: RETURN_AT, label: "Returns the rounded total" }] }])

    expect(labelsOf(outcome)).toStrictEqual([[], [null, "Returns the rounded total", null]])
  })

  it("writes a row with no place by its code block id alone", () => {
    const outcome = amendTrace([FUNCTION_CARD_SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "empty", label: "Throws an Error when the cart is empty" }] }])

    expect(labelsOf(outcome)).toStrictEqual([[], [null, null, "Throws an Error when the cart is empty"]])
  })

  it("refuses a row written without the place its node lists it at, and names the places it has", () => {
    const outcome = amendTrace([FUNCTION_CARD_SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "subtotal", label: "Rounds the total" }] }])

    expect(outcome.kind === "refused" ? outcome.message : "").toContain(
      "there is none for `subtotal` on `j-subtotal` (that block is listed with `\"at\": {\"line\":7,\"column\":3}`, `\"at\": {\"line\":8,\"column\":5}`)",
    )
  })

  it("refuses a row written at a place its node does not list", () => {
    const outcome = amendTrace([FUNCTION_CARD_SEGMENT], [{ id: DRAFT_TRACE_NODE.id, blockLabels: [{ codeBlockId: "empty", at: CALL_AT, label: "Throws an Error" }] }])

    expect(outcome.kind === "refused" ? outcome.message : "").toContain("there is none for `empty@7:3` on `j-subtotal` (that block is listed with no `at`)")
  })

  it("writes the return label of a component card by its place, and a render row and an effect row by their code block id", () => {
    const outcome = amendTrace([COMPONENT_CARD_SEGMENT], [{
      id: DRAFT_TRACE_NODE.id,
      blockLabels: [
        { codeBlockId: "subtotal", at: RETURN_GROUP_AT, label: "Renders the lines and the total of the cart" },
        { codeBlockId: "lines", label: "Renders a row for each line of the cart" },
        { codeBlockId: "effect", label: "Saves the cart after a render with new lines" },
      ],
    }])

    expect(labelsOf(outcome)).toStrictEqual([[], ["Renders the lines and the total of the cart", "Renders a row for each line of the cart", "Saves the cart after a render with new lines"]])
  })
})
