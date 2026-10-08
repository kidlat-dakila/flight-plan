import { createComponentReturn, createDeclarationNode, createSegment, createViewContext, PRICE_PATH } from "@/__tests__/review-fixture"
import { DEFAULT_DIAGRAM_SETTINGS } from "@/diagram/settings"
import { buildJourney } from "@/journey/build"
import type { JourneyEdge, JourneyFlow } from "@flightplan/configurations"

const edge = (from: string, to: string, overrides: Partial<JourneyEdge> = {}): JourneyEdge => ({
  from,
  to,
  kind: "call",
  certainty: "proven",
  through: [],
  ...overrides,
})

const flow: JourneyFlow = {
  id: "flow",
  title: "Saving a review",
  nodes: [
    { kind: "entry-point", id: "click", trigger: "user-action", label: "A user clicks Save", description: null, traceEnd: null },
    createDeclarationNode("button", { declaration: "SaveButton", label: null }),
    createDeclarationNode("page", { declaration: "ReviewPage", label: null }),
    createDeclarationNode("save", {
      declaration: "saveReview",
      changeType: "diff",
      label: "Saves the review",
      tracedLines: [
        { line: 2, text: "  if (review.isDraft) {", isChanged: false },
        { line: 3, text: "    return store.save(review)", isChanged: true },
      ],
    }),
  ],
  edges: [
    edge("click", "button", { kind: "trigger" }),
    edge("button", "save", { kind: "value", through: ["Editor.onSave", "ReviewPage"] }),
    edge("page", "button"),
    edge("page", "save", { kind: "value", certainty: "assumed" }),
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
    const added = { ...flow, nodes: [createDeclarationNode("save", { changeType: "diff", isAdded: true })], edges: [] }

    expect(diagramOf(added)?.nodes.map((node) => [node.change, node.changedLabel])).toStrictEqual([["added", "Added"]])
  })

  it("gives an edge the nodes it joins", () => {
    expect(diagramOf(flow)?.edges.map((drawn) => [drawn.from, drawn.to])).toContainEqual(["click", "button"])
  })

  it("heads the traced lines of a node that has some, and gives no heading to a node or an entry point without them", () => {
    const [entry, button, , save] = diagramOf(flow)?.nodes ?? []

    expect([entry.tracedHeading, button.tracedHeading, save.tracedHeading]).toStrictEqual([null, null, "Traced lines"])
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

  it("draws a traced line with the tokens its text was highlighted into", () => {
    const keyword = [{ text: "    return", kind: "keyword" as const }, { text: " store.save(review)", kind: "plain" as const }]
    const context = { ...createViewContext(), tracedLineTokens: new Map([[`${PRICE_PATH}\n    return store.save(review)`, keyword]]) }
    const save = buildJourney(createSegment({ journey: flow }), "", DEFAULT_DIAGRAM_SETTINGS, context).diagram?.nodes.find((node) => node.id === "save")

    expect(save?.tracedCode?.lines[1].tokens).toStrictEqual(keyword)
  })

  it("draws every edge as the same line: it carries its two ends and its points, and no kind, certainty or label", () => {
    expect(diagramOf(flow)?.edges.map((drawn) => Object.keys(drawn))).toStrictEqual([
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
    ])
  })

  it("draws each return of a component as a frame that opens a node of its own, with its label, its change and its traced lines", () => {
    const returning: JourneyFlow = {
      id: "returning",
      title: "Orders",
      nodes: [
        createDeclarationNode("page", {
          declaration: "OrdersPage",
          category: "ui",
          changeType: "diff",
          label: "Shows a shopper's orders",
          returns: [
            createComponentReturn("page#return@9", { statement: "if (isPending) return", reference: [9, 9] }),
            createComponentReturn("page#return@11", {
              reference: [11, 12],
              changeType: "diff",
              isAdded: true,
              label: "Renders the orders",
              description: "Lists one row per order.",
              tracedLines: [{ line: 11, text: "  return <ul />", isChanged: true }],
            }),
          ],
        }),
      ],
      edges: [],
    }

    const diagram = diagramOf(returning)
    const [card] = diagram?.uiCards ?? []

    expect(card).toMatchObject({ label: "OrdersPage", sublabel: PRICE_PATH, nodeId: "page" })
    expect(card.frames.map(({ role, nodeId, ownerNodeId, label, isDraft, change, changedLabel }) => [role, nodeId, ownerNodeId, label, isDraft, change, changedLabel])).toStrictEqual([
      ["return", "page#return@9", "page", "if (isPending) return", true, null, null],
      ["return", "page#return@11", "page", "Renders the orders", false, "added", "Added"],
    ])
    expect(diagram?.nodes.map((node) => [node.kind, node.id, node.label, node.isDraft, node.isInsideCard, node.tracedCode?.rangeLabel ?? null])).toStrictEqual([
      ["code", "page", "Shows a shopper's orders", false, true, null],
      ["return", "page#return@9", "if (isPending) return", true, true, null],
      ["return", "page#return@11", "Renders the orders", false, true, "Line 11"],
    ])
  })

  it("gives the band no diagram for a segment without a journey", () => {
    expect(buildJourney(createSegment({ journey: null }), "", DEFAULT_DIAGRAM_SETTINGS, createViewContext()).diagram).toBeNull()
  })
})
