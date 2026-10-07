import { createDeclarationNode, createSegment, createViewContext, PRICE_PATH } from "@/__tests__/review-fixture"
import { DEFAULT_DIAGRAM_SETTINGS } from "@/diagram/settings"
import { buildJourney } from "@/journey/build"
import type { JourneyEdge, JourneyFlow } from "@flightplan/configurations"

const edge = (from: string, to: string, overrides: Partial<JourneyEdge> = {}): JourneyEdge => ({
  from,
  to,
  kind: "call",
  certainty: "proven",
  through: [],
  condition: null,
  frameLines: [],
  ...overrides,
})

const flow: JourneyFlow = {
  id: "flow",
  title: "Saving a review",
  nodes: [
    { kind: "entry-point", id: "click", trigger: "user-action", label: "A user clicks Save", description: null },
    createDeclarationNode("button", { declaration: "SaveButton", label: null }),
    createDeclarationNode("page", { declaration: "ReviewPage", label: null }),
    createDeclarationNode("save", {
      declaration: "saveReview",
      isChanged: true,
      label: "Saves the review",
      frameLines: [
        { line: 2, text: "  if (review.isDraft) {", isChanged: false },
        { line: 3, text: "    return store.save(review)", isChanged: true },
      ],
    }),
  ],
  edges: [
    edge("click", "button", { kind: "trigger" }),
    edge("button", "save", { kind: "value", through: ["Editor.onSave", "ReviewPage"] }),
    edge("page", "button", { condition: "if review" }),
    edge("page", "save", {
      kind: "value",
      certainty: "assumed",
      frameLines: [{ line: 7, text: "  const handleSave = () => saveReview(review)", isChanged: false }],
    }),
  ],
}

const diagramOf = (journey: JourneyFlow) =>
  buildJourney(createSegment({ journey }), "", DEFAULT_DIAGRAM_SETTINGS, createViewContext()).diagram

describe("buildJourney", () => {
  it("draws an entry point and a code node, and marks the code node the diff touched", () => {
    const nodes = diagramOf(flow)?.nodes.map((node) => [node.kind, node.label, node.change, node.changedLabel])

    expect(nodes).toStrictEqual([
      ["entry-point", "A user clicks Save", null, null],
      ["code", "SaveButton", null, null],
      ["code", "ReviewPage", null, null],
      ["code", "Saves the review", "modified", "Modified"],
    ])
  })

  it("marks a code node whose every line is new as added", () => {
    const added = { ...flow, nodes: [createDeclarationNode("save", { isChanged: true, isAdded: true })], edges: [] }

    expect(diagramOf(added)?.nodes.map((node) => [node.change, node.changedLabel])).toStrictEqual([["added", "Added"]])
  })

  it("gives an edge the nodes it joins", () => {
    expect(diagramOf(flow)?.edges.map((drawn) => [drawn.from, drawn.to])).toContainEqual(["click", "button"])
  })

  it("gives a node one call stack per node that points to it: the frame of that node up to the hand-over, then its own", () => {
    const save = diagramOf(flow)?.nodes.find((node) => node.id === "save")
    const ownFrame = {
      label: "Saves the review",
      pathLabel: PRICE_PATH,
      changedLabel: "Modified",
      lines: [
        { numberLabel: "2", mark: "context", isFocused: false, tokens: [{ text: "  if (review.isDraft) {", kind: "plain" }] },
        { numberLabel: "3", mark: "added", isFocused: false, tokens: [{ text: "    return store.save(review)", kind: "plain" }] },
      ],
    }

    expect(save?.callStackHeading).toBe("Call stack")
    expect(save?.callStacks).toStrictEqual([
      { label: "SaveButton", frames: [{ label: "SaveButton", pathLabel: PRICE_PATH, changedLabel: null, lines: [] }, ownFrame] },
      {
        label: "ReviewPage",
        frames: [
          {
            label: "ReviewPage",
            pathLabel: PRICE_PATH,
            changedLabel: null,
            lines: [{ numberLabel: "7", mark: "context", isFocused: false, tokens: [{ text: "  const handleSave = () => saveReview(review)", kind: "plain" }] }],
          },
          ownFrame,
        ],
      },
    ])
  })

  it("stops a call stack at the parent node and does not go on to what points to the parent", () => {
    const save = diagramOf(flow)?.nodes.find((node) => node.id === "save")

    expect(save?.callStacks.map((stack) => stack.frames.map((frame) => frame.label))).toStrictEqual([
      ["SaveButton", "Saves the review"],
      ["ReviewPage", "Saves the review"],
    ])
  })

  it("names the call stack of a node an entry point triggers after that entry point, with the node's own frame alone", () => {
    const triggered: JourneyFlow = {
      ...flow,
      nodes: [flow.nodes[0], createDeclarationNode("button", { label: null, declaration: "SaveButton", isChanged: true, frameLines: [{ line: 4, text: "  props.onSave()", isChanged: true }] })],
      edges: [edge("click", "button", { kind: "trigger" })],
    }
    const [, button] = diagramOf(triggered)?.nodes ?? []

    expect(button.callStacks.map((stack) => [stack.label, stack.frames.map((frame) => frame.label)])).toStrictEqual([["A user clicks Save", ["SaveButton"]]])
  })

  it("gives a call stack from an entry point the lines that entry point runs, when its edge carries them", () => {
    const button = createDeclarationNode("button", {
      label: null,
      declaration: "SaveButton",
      isChanged: true,
      frameLines: [{ line: 2, text: "  const label = labelOf(props)", isChanged: true }, { line: 4, text: "  return <button onClick={props.onSave}>Save</button>", isChanged: false }],
    })
    const clicked: JourneyFlow = {
      ...flow,
      nodes: [flow.nodes[0], button],
      edges: [edge("click", "button", { kind: "trigger", frameLines: [{ line: 4, text: "  return <button onClick={props.onSave}>Save</button>", isChanged: false }] })],
    }
    const [, drawn] = diagramOf(clicked)?.nodes ?? []

    expect(drawn.callStacks.map((stack) => stack.frames.map((frame) => frame.lines.map((line) => line.numberLabel)))).toStrictEqual([[["4"]]])
  })

  it("refers to the code of a node by its file, the range of its traced lines, those lines and the link to them", () => {
    const save = diagramOf(flow)?.nodes.find((node) => node.id === "save")

    expect(save?.tracedCode).toStrictEqual({
      pathLabel: PRICE_PATH,
      rangeLabel: "Lines 2 to 3, 2 lines",
      lines: [
        { numberLabel: "2", mark: "context", isFocused: false, tokens: [{ text: "  if (review.isDraft) {", kind: "plain" }] },
        { numberLabel: "3", mark: "added", isFocused: false, tokens: [{ text: "    return store.save(review)", kind: "plain" }] },
      ],
      anchorId: null,
      forgeLink: createViewContext().blobLinkOf(PRICE_PATH, { lineStart: 2, lineEnd: 3 }),
    })
  })

  it("gives an entry point and a node with no traced lines no code reference of their own", () => {
    const [entry, button] = diagramOf(flow)?.nodes ?? []

    expect([entry.tracedCode, button.tracedCode]).toStrictEqual([null, null])
  })

  it("draws a line of a frame with the tokens its text was highlighted into", () => {
    const keyword = [{ text: "    return", kind: "keyword" as const }, { text: " store.save(review)", kind: "plain" as const }]
    const context = { ...createViewContext(), frameTokens: new Map([[`${PRICE_PATH}\n    return store.save(review)`, keyword]]) }
    const save = buildJourney(createSegment({ journey: flow }), "", DEFAULT_DIAGRAM_SETTINGS, context).diagram?.nodes.find((node) => node.id === "save")

    expect(save?.callStacks[0].frames[1].lines[1].tokens).toStrictEqual(keyword)
  })

  it("gives a node whose frames step through no line no call stack", () => {
    const [entry, button] = diagramOf(flow)?.nodes ?? []

    expect([entry.callStackHeading, entry.callStacks, button.callStackHeading, button.callStacks]).toStrictEqual([null, [], null, []])
  })

  it("labels an edge with what it passes through, its condition and its certainty, and leaves a plain call bare", () => {
    expect(diagramOf(flow)?.edges.map((drawn) => drawn.label?.text ?? null)).toStrictEqual([
      null,
      "through Editor.onSave, ReviewPage",
      "if review",
      "value, assumed",
    ])
  })

  it("gives the band no diagram for a segment without a journey", () => {
    expect(buildJourney(createSegment({ journey: null }), "", DEFAULT_DIAGRAM_SETTINGS, createViewContext()).diagram).toBeNull()
  })
})
