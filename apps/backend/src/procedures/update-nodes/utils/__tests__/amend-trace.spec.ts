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
})
