import { EVERY_FILE_REVIEWED_MESSAGE } from "@/labels"
import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@/marks"
import type { ReviewableFile } from "@/reviewable-file"
import { hiddenFileAnchorIdsOf, withReviewedRail } from "@/reviewed-rail"
import { reviewSegment, withReviewedTrace, withReviewedWalkthrough } from "@/reviewed-segment"
import type { FileRow, FileSectionView, TraceBand, WalkthroughBand, WaypointView } from "@flightplan/configurations"

const ROOT = "src/price.ts#function:priceOf"

const OUTLINE: ReviewableFile[] = [
  {
    path: "src/price.ts",
    fingerprint: "price-file",
    waypoints: [
      { id: "price-of", fingerprint: "price-of-1", depth: 0, rootBlockIds: [ROOT] },
      { id: "tax", fingerprint: "tax-1", depth: 0, rootBlockIds: [] },
    ],
    rootBlocks: [{ id: ROOT, fingerprint: "root-1" }],
  },
  {
    path: "src/cart.ts",
    fingerprint: "cart-file",
    waypoints: [{ id: "subtotal", fingerprint: "subtotal-1", depth: 0, rootBlockIds: [] }],
    rootBlocks: [],
  },
]

const waypointView = (id: string, positionLabel: string, previousId: string | null, nextId: string | null): WaypointView => ({
  id,
  anchorId: `waypoint-${id}`,
  depth: 0,
  title: id,
  isDraft: false,
  positionLabel,
  rangeLabel: null,
  mark: { kind: "bug", kindLabel: "Bug", label: `Bug waypoint ${positionLabel}: ${id}` },
  previousId,
  nextId,
  chip: null,
  coreChangeLabel: null,
  reading: null,
  unwrittenLabel: "Not written yet.",
  hint: null,
  isBeingWritten: false,
  spotlight: null,
  coreChange: null,
  findings: [],
  isReviewed: false,
  reviewLabel: "Reviewed",
  lines: null,
  text: { title: id, reading: "", coreChange: null },
})

const waypointRow = (waypoint: WaypointView): FileRow => ({ kind: "waypoint", id: `waypoint-${waypoint.id}`, waypoint, rootBlockId: null })

const fileView = (path: string, rows: FileRow[], rootBlockIds: readonly string[] = []): FileSectionView => ({
  anchorId: path,
  path,
  title: path,
  isReviewed: false,
  reviewLabel: "File reviewed",
  countLabels: [],
  forgeLink: null,
  rootBlocks: rootBlockIds.map((id) => ({
    id,
    classification: { key: "logic", label: "Logic" },
    spotlight: null,
    coreChangeLabel: null,
    isReviewed: false,
    isFoldedByFilter: false,
    reviewLabel: "Reviewed",
    reviewName: `Reviewed: ${id}`,
    expandLabel: "",
    collapseLabel: "",
  })),
  rows,
})

const WALKTHROUGH: WalkthroughBand = {
  anchorId: "code-walkthrough",
  heading: "Code Walkthrough",
  coverageLabel: "All 2 changed files",
  emptyMessage: null,
  controls: {
    filter: { buttonLabel: "Filter", badge: null, heading: "Filter", groups: [], submenus: [] },
    reviewedToggle: { label: "Reviewed", countLabel: "0 waypoints", isShown: false, isAvailable: false },
    stepping: { previousLabel: "Previous waypoint", nextLabel: "Next waypoint" },
    currentReview: { markLabel: "Mark as reviewed", reviewedLabel: "Reviewed" },
  },
  files: [
    fileView("src/price.ts", [waypointRow(waypointView("price-of", "1 of 3", null, "tax")), waypointRow(waypointView("tax", "2 of 3", "price-of", "subtotal"))], [ROOT]),
    fileView("src/cart.ts", [waypointRow(waypointView("subtotal", "3 of 3", "tax", null))]),
  ],
  fileOrder: [],
}

const markedRoot: ReviewedMarks = { ...NO_REVIEWED_MARKS, rootBlocks: { [ROOT]: "root-1" } }

const shownWaypointsOf = (walkthrough: WalkthroughBand) =>
  walkthrough.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

describe("withReviewedWalkthrough", () => {
  it("hides the reviewed waypoints and steps through the rest in order", () => {
    const walkthrough = withReviewedWalkthrough(WALKTHROUGH, reviewSegment(OUTLINE, markedRoot, false))

    expect(shownWaypointsOf(walkthrough).map((waypoint) => [waypoint.id, waypoint.positionLabel, waypoint.previousId, waypoint.nextId, waypoint.mark.label])).toStrictEqual([
      ["tax", "1 of 2", null, "subtotal", "Bug waypoint 1 of 2: tax"],
      ["subtotal", "2 of 2", "tax", null, "Bug waypoint 2 of 2: subtotal"],
    ])
    expect(walkthrough.files[0].rootBlocks[0].isReviewed).toBe(true)
    expect(walkthrough.controls.reviewedToggle).toStrictEqual({ label: "Reviewed", countLabel: "1 waypoint", isShown: false, isAvailable: true })
  })

  it("shows the reviewed waypoints as reviewed while the reviewed are shown", () => {
    const walkthrough = withReviewedWalkthrough(WALKTHROUGH, reviewSegment(OUTLINE, markedRoot, true))

    expect(shownWaypointsOf(walkthrough).map((waypoint) => [waypoint.id, waypoint.isReviewed])).toStrictEqual([
      ["price-of", true],
      ["tax", false],
      ["subtotal", false],
    ])
  })

  it("drops a reviewed file and says so once every file is reviewed", () => {
    const everyFile: ReviewedMarks = { ...NO_REVIEWED_MARKS, files: { "src/price.ts": "price-file", "src/cart.ts": "cart-file" } }
    const priceOnly = withReviewedWalkthrough(WALKTHROUGH, reviewSegment(OUTLINE, { ...NO_REVIEWED_MARKS, files: { "src/price.ts": "price-file" } }, false))
    const none = withReviewedWalkthrough(WALKTHROUGH, reviewSegment(OUTLINE, everyFile, false))

    expect(priceOnly.files.map((file) => file.path)).toStrictEqual(["src/cart.ts"])
    expect(none.files).toStrictEqual([])
    expect(none.emptyMessage).toBe(EVERY_FILE_REVIEWED_MESSAGE)
  })
})

describe("withReviewedTrace", () => {
  it("drops the reviewed waypoints from the code a node shows, in the diagram and in each tab", () => {
    const traceDiagram: TraceBand = {
      anchorId: "traceDiagram",
      heading: "Trace",
      diagram: {
        anchorId: "diagram",
        title: "Diagram",
        writtenTitle: null,
        description: null,
        descriptionMarkdown: "",
        descriptionHint: null,
        unwrittenLabel: "",
        edges: [],
        nodes: [
          {
            id: "node",
            type: "function",
            typeLabel: "Function",
            classification: { key: "logic", label: "Logic" },
            change: null,
            changedLabel: null,
            label: "priceOf",
            isDraft: false,
            hint: null,
            isBeingWritten: false,
            name: "priceOf",
            shortPath: "price.ts",
            description: null,
            codeLinkId: null,
            codeViews: [
              {
                id: "view",
                heading: "Code",
                countLabel: null,
                pathLabel: "src/price.ts",
                rangeLabel: "",
                rows: [waypointRow(waypointView("price-of", "1 of 3", null, "tax")), waypointRow(waypointView("tax", "2 of 3", "price-of", "subtotal"))],
                note: null,
                forgeLink: null,
              },
            ],
            parameters: [],
            blockLists: [],
            triggerLabels: [],
            rowGroups: [],
            position: null,
            children: [],
          },
        ],
      },
      tabs: [],
    }

    const reviewed = withReviewedTrace(traceDiagram, reviewSegment(OUTLINE, markedRoot, false))
    const tabbed = withReviewedTrace(
      { ...traceDiagram, diagram: null, tabs: traceDiagram.diagram === null ? [] : [{ id: "tab", label: "Tab", diagram: traceDiagram.diagram }] },
      reviewSegment(OUTLINE, markedRoot, false),
    )

    expect(reviewed.diagram?.nodes[0].codeViews[0].rows.map((row) => row.id)).toStrictEqual(["waypoint-tax"])
    expect(tabbed.tabs[0]?.diagram.nodes[0].codeViews[0].rows.map((row) => row.id)).toStrictEqual(["waypoint-tax"])
  })
})

describe("withReviewedRail", () => {
  it("leaves the hidden files out of the rail", () => {
    const review = reviewSegment(OUTLINE, { ...NO_REVIEWED_MARKS, files: { "src/price.ts": "price-file" } }, false)
    const rail = {
      groups: [{ label: "Stock", sections: [{ label: "Code Walkthrough", children: [{ anchorId: "src/price.ts" }, { anchorId: "src/cart.ts" }] }] }],
      sections: [],
    }

    const reviewed = withReviewedRail(rail, new Set(hiddenFileAnchorIdsOf(WALKTHROUGH.files, review)))

    expect(reviewed.groups[0].sections[0].children).toStrictEqual([{ anchorId: "src/cart.ts" }])
    expect(reviewed.groups[0].label).toBe("Stock")
  })
})
