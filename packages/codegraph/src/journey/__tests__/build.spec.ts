import { CART_PATH, createComponentReturn, createDeclarationNode, createSegment, createViewContext, PRICE_PATH } from "@/__tests__/review-fixture"
import { DEFAULT_DIAGRAM_SETTINGS } from "@/diagram/settings"
import { buildJourney } from "@/journey/build"
import { listWaypointPlaces, prepareWalkthrough, steppingOf } from "@/walkthrough/build"
import { NO_REVIEWED_MARKS } from "@/walkthrough/reviewed-marks"
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
      codeViews: [{ kind: "declaration", path: PRICE_PATH, lines: [[11, 12]], marks: [], entryCount: 1 }],
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
  buildJourney(createSegment({ journey }), "", DEFAULT_DIAGRAM_SETTINGS, [], createViewContext()).diagram

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

  it("gives a node one code view per stored view, with its heading, its file, its range, its rows and the link", () => {
    const save = diagramOf(flow)?.nodes.find((node) => node.id === "save")

    expect(save?.codeViews.map(({ rows, ...view }) => ({ ...view, rowKinds: rows.map((row) => row.kind) }))).toStrictEqual([
      {
        id: "save:declaration:0",
        heading: "Declaration",
        countLabel: null,
        pathLabel: PRICE_PATH,
        rangeLabel: "Lines 11 to 12",
        note: null,
        forgeLink: createViewContext().blobLinkOf(PRICE_PATH, { lineStart: 11, lineEnd: 12 }),
        rowKinds: ["lines"],
      },
    ])
  })

  it("shows the lines of a view as the Code Walkthrough does, with the removed line above the lines that replace it", () => {
    const [view] = diagramOf(flow)?.nodes.find((node) => node.id === "save")?.codeViews ?? []
    const [row] = view.rows

    expect(row.kind === "lines" ? row.lines.map((line) => [line.numberLabel, line.mark]) : null).toStrictEqual([
      ["", "removed"],
      ["11", "added"],
      ["12", "added"],
    ])
  })

  it("sets the box of a waypoint above the lines it explains", () => {
    const segment = createSegment({ journey: flow })
    const context = createViewContext()
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, { filterKeys: [], isShowingReviewed: true }, context)
    const places = listWaypointPlaces(prepared, steppingOf([prepared]), context)
    const save = buildJourney(segment, "", DEFAULT_DIAGRAM_SETTINGS, places, context).diagram?.nodes.find((node) => node.id === "save")

    expect(save?.codeViews[0].rows.map((row) => (row.kind === "waypoint" ? row.waypoint.id : row.kind))).toStrictEqual(["price-of", "lines"])
  })

  it("stands a gap for the lines between two spans of a view, counts its entries and marks the columns it names", () => {
    const reading = createDeclarationNode("reading", {
      changeType: "diff",
      codeViews: [{ kind: "data", path: PRICE_PATH, lines: [[3, 3], [7, 7]], marks: [{ line: 3, startColumn: 6, endColumn: 11 }], entryCount: 2 }],
    })
    const [view] = diagramOf({ ...flow, nodes: [reading], edges: [] })?.nodes[0].codeViews ?? []
    const [first, gap] = view.rows

    expect([view.heading, view.countLabel, view.rangeLabel]).toStrictEqual(["Data", "2 values", "Lines 3, 7"])
    expect(view.rows.map((row) => row.kind)).toStrictEqual(["lines", "gap", "lines"])
    expect(gap.kind === "gap" ? gap.label : null).toBe("3 lines hidden")
    expect(first.kind === "lines" ? first.lines[0].marks : null).toStrictEqual([{ fromColumn: 7, toColumn: 11 }])
  })

  it("notes a view of a file the change did not touch", () => {
    const segment = createSegment({ journey: flow, changedPaths: [CART_PATH] })
    const save = buildJourney(segment, "", DEFAULT_DIAGRAM_SETTINGS, [], createViewContext()).diagram?.nodes.find((node) => node.id === "save")

    expect(save?.codeViews[0].note).toBe("Unchanged by this change")
  })

  it("gives an entry point, and a node whose file has no source, no code view", () => {
    const missing = createDeclarationNode("missing", { changeType: "diff", codeViews: [{ kind: "declaration", path: "src/gone.ts", lines: [[1, 2]], marks: [], entryCount: 1 }] })
    const [entry, node] = diagramOf({ ...flow, nodes: [flow.nodes[0], missing], edges: [edge("click", "missing", { kind: "trigger" })] })?.nodes ?? []

    expect([entry.codeViews, node.codeViews]).toStrictEqual([[], []])
  })

  it("draws every edge as the same line: it carries its two ends and its points, and no kind, certainty or label", () => {
    expect(diagramOf(flow)?.edges.map((drawn) => Object.keys(drawn))).toStrictEqual([
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
      ["id", "from", "to", "points", "isInsideCard"],
    ])
  })

  it("draws each return of a component as a frame that opens a node of its own, with its label, its change and its code views", () => {
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
              codeViews: [{ kind: "render", path: PRICE_PATH, lines: [[11, 12]], marks: [], entryCount: 1 }],
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
    expect(diagram?.nodes.map((node) => [node.kind, node.id, node.label, node.isDraft, node.isInsideCard, node.codeViews.map((view) => view.heading)])).toStrictEqual([
      ["code", "page", "Shows a shopper's orders", false, true, []],
      ["return", "page#return@9", "if (isPending) return", true, true, []],
      ["return", "page#return@11", "Renders the orders", false, true, ["Render"]],
    ])
  })

  it("gives the band no diagram for a segment without a journey", () => {
    expect(buildJourney(createSegment({ journey: null }), "", DEFAULT_DIAGRAM_SETTINGS, [], createViewContext()).diagram).toBeNull()
  })
})
