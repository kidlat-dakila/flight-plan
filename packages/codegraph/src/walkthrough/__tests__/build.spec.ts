import {
  CART_PATH,
  cartSource,
  createFinding,
  createSegment,
  createViewContext,
  createWaypoint,
  PRICE_PATH,
  priceSource,
} from "@/procedures/get-review/utils/__tests__/review-fixture"
import { EMPTY_DISCUSSION } from "@/procedures/get-review/utils/discussion"
import type { Segment } from "@/procedures/get-review/utils/review-artifact"
import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@/procedures/get-review/utils/review-store"
import type { FileRow, WalkthroughBand, WalkthroughControls } from "@/procedures/get-review/utils/schemas"
import {
  buildWalkthrough,
  buildWalkthroughControls,
  prepareWalkthrough,
  steppingOf,
  type WalkthroughRequest,
} from "@/procedures/get-review/utils/walkthrough/build"
import { flattenWaypoints } from "@/procedures/get-review/utils/walkthrough/waypoints"

const EVERYTHING: WalkthroughRequest = { filterKeys: [], isShowingReviewed: false }
const NOW = new Date("2026-10-01T12:00:00.000Z")
const NO_DISCUSSION = { discussion: EMPTY_DISCUSSION, now: NOW }

const build = (segment: Segment, marks: ReviewedMarks = NO_REVIEWED_MARKS, request = EVERYTHING): WalkthroughBand => {
  const prepared = prepareWalkthrough(segment, marks, request, createViewContext())
  return buildWalkthrough(prepared, "", request, steppingOf([prepared]), NO_DISCUSSION, createViewContext())
}

const buildControls = (segment: Segment, marks: ReviewedMarks = NO_REVIEWED_MARKS, request = EVERYTHING): WalkthroughControls => {
  const prepared = prepareWalkthrough(segment, marks, request, createViewContext())
  return buildWalkthroughControls([prepared], request, steppingOf([prepared]))
}

const rowKinds = (rows: readonly FileRow[]): string[] => rows.map((row) => row.kind)

const waypointIds = (band: WalkthroughBand): string[] =>
  band.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint.id] : [])))

const markWaypoint = (segment: Segment, waypointId: string): ReviewedMarks => {
  const flat = segment.walkthrough.files
    .flatMap((file) => flattenWaypoints(file, file.path === PRICE_PATH ? priceSource : cartSource))
    .find((candidate) => candidate.waypoint.id === waypointId)
  return { waypoints: flat === undefined ? {} : { [waypointId]: flat.fingerprint }, files: {} }
}

describe("buildWalkthrough", () => {
  it("numbers the waypoints across every segment, and prefixes a segment's anchors with its scope", () => {
    const context = createViewContext()
    const first = prepareWalkthrough(createSegment({ id: "one" }), NO_REVIEWED_MARKS, EVERYTHING, context)
    const second = prepareWalkthrough(
      createSegment({
        id: "two",
        walkthrough: { intro: null, files: [{ path: CART_PATH, title: "Cart file", summary: [], waypoints: [createWaypoint("late", "subtotal")] }] },
      }),
      NO_REVIEWED_MARKS,
      EVERYTHING,
      context,
    )
    const band = buildWalkthrough(second, "two-", EVERYTHING, steppingOf([first, second]), NO_DISCUSSION, context)

    expect(band).toMatchObject({ anchorId: "two-code-walkthrough", files: [{ anchorId: "two-file-1" }] })
    expect(waypointIds(band)).toStrictEqual(["late"])
    expect(band.files[0].rows.find((row) => row.kind === "waypoint")).toMatchObject({
      waypoint: { positionLabel: "4 of 4", previousId: "subtotal", nextId: null },
    })
  })

  it("attaches a file's comment threads to their lines, and keeps a commented line out of a gap", () => {
    const prepared = prepareWalkthrough(createSegment(), NO_REVIEWED_MARKS, EVERYTHING, createViewContext())
    const discussion = {
      reviews: [],
      threads: [
        {
          id: "thread-1",
          path: PRICE_PATH,
          line: 2,
          comments: [{ id: "comment-1", author: "amara", body: "Why `rates`?", createdAt: new Date(NOW.getTime() - 3_600_000), isPending: true }],
        },
      ],
    }
    const [priceFile] = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), { discussion, now: NOW }, createViewContext()).files

    expect(priceFile.threads).toMatchObject([
      {
        id: "thread-1",
        lineLabel: "2",
        comments: [{ author: { name: "amara", monogram: "A" }, timeLabel: "1 hour ago", pendingLabel: "Pending" }],
      },
    ])
    expect(rowKinds(priceFile.rows).slice(0, 3)).toStrictEqual(["lines", "gap", "lines"])
  })

  it("draws each file once, with a waypoint box above the lines it is about", () => {
    const [priceFile] = build(createSegment()).files

    expect(priceFile.path).toBe(PRICE_PATH)
    expect(rowKinds(priceFile.rows)).toStrictEqual(["gap", "lines", "waypoint", "lines", "waypoint", "lines"])
  })

  it("shows a run of unchanged lines that is too short to be worth folding", () => {
    const segment = createSegment({
      walkthrough: { intro: null, files: [{ path: PRICE_PATH, title: "Price file", summary: [], waypoints: [createWaypoint("format", "format")] }] },
    })
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, createViewContext())
    const pinned = {
      now: NOW,
      discussion: {
        reviews: [],
        threads: [{ id: "thread-1", path: PRICE_PATH, line: 4, comments: [] }],
      },
    }
    const [priceFile] = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), pinned, createViewContext()).files

    expect(rowKinds(priceFile.rows)).toStrictEqual(["lines", "waypoint", "lines"])
  })

  it("folds the unchanged lines far from a change into a gap that says how many", () => {
    const [priceFile] = build(createSegment()).files

    expect(priceFile.rows[0]).toMatchObject({ kind: "gap", label: "7 unchanged lines" })
  })

  it("states how many of the changed files it covers", () => {
    expect(build(createSegment({ changedPaths: [PRICE_PATH, CART_PATH, "src/gone.sql"] })).coverageLabel).toBe("2 of 3 changed files")
    expect(build(createSegment()).coverageLabel).toBe("All 2 changed files")
  })

  it("numbers the waypoints in reading order across files, and links each to its neighbours", () => {
    const band = build(createSegment())
    const waypoints = band.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

    expect(waypoints.map((waypoint) => [waypoint.id, waypoint.positionLabel, waypoint.previousId, waypoint.nextId])).toStrictEqual([
      ["price-of", "1 of 3", null, "format"],
      ["format", "2 of 3", "price-of", "subtotal"],
      ["subtotal", "3 of 3", "format", null],
    ])
    expect(buildControls(createSegment()).stepping).toMatchObject({
      firstWaypointId: "price-of",
      lastWaypointId: "subtotal",
      idleLabel: "3 waypoints",
    })
  })

  it("places a nested waypoint one level deeper, after its parent", () => {
    const segment = createSegment({
      walkthrough: {
        intro: null,
        files: [
          {
            path: PRICE_PATH,
            title: "Price file",
            summary: [],
            waypoints: [createWaypoint("parent", "priceOf", { children: [createWaypoint("child", "format")] })],
          },
        ],
      },
    })
    const waypoints = build(segment).files[0].rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))

    expect(waypoints.map((waypoint) => [waypoint.id, waypoint.depth])).toStrictEqual([["parent", 0], ["child", 1]])
  })

  it("shows the most severe finding's chip, and marks an unwritten waypoint as a draft", () => {
    const segment = createSegment({
      walkthrough: {
        intro: null,
        files: [
          {
            path: PRICE_PATH,
            title: "Price file",
            summary: [],
            waypoints: [
              createWaypoint("found", "priceOf", {
                needsAttention: "Slow down.",
                findings: [createFinding("nit", "nit"), createFinding("risk", "risk")],
              }),
              createWaypoint("unwritten", "format", { title: null, reading: "" }),
            ],
          },
        ],
      },
    })
    const [found, unwritten] = build(segment).files[0].rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))

    expect(found).toMatchObject({ chip: { kind: "risk", label: "Risk" }, attentionLabel: "Needs Attention", isDraft: false })
    expect(unwritten).toMatchObject({ title: "format", isDraft: true, reading: null, chip: null })
  })

  it("keeps the code and drops the box of a waypoint the filter hides, and drops a file with no box left", () => {
    const segment = createSegment({
      walkthrough: {
        intro: null,
        files: [
          {
            path: PRICE_PATH,
            title: "Price file",
            summary: [],
            waypoints: [
              createWaypoint("buggy", "priceOf", { findings: [createFinding("bug", "bug")] }),
              createWaypoint("clean", "format"),
            ],
          },
          { path: CART_PATH, title: "Cart file", summary: [], waypoints: [createWaypoint("subtotal", "subtotal")] },
        ],
      },
    })
    const request: WalkthroughRequest = { filterKeys: ["bug"], isShowingReviewed: false }
    const band = build(segment, NO_REVIEWED_MARKS, request)

    expect(band.files.map((file) => file.path)).toStrictEqual([PRICE_PATH])
    expect(waypointIds(band)).toStrictEqual(["buggy"])
    expect(rowKinds(band.files[0].rows)).toStrictEqual(["gap", "lines", "waypoint", "lines"])
    expect(buildControls(segment, NO_REVIEWED_MARKS, request).stepping.idleLabel).toBe("1 waypoint")
  })

  it("says so when no waypoint matches the filter", () => {
    const band = build(createSegment(), NO_REVIEWED_MARKS, { filterKeys: ["bug"], isShowingReviewed: false })

    expect(band).toMatchObject({ files: [], emptyMessage: "No waypoint matches the filter." })
  })

  it("hides a reviewed waypoint, counts it, and shows it again on request", () => {
    const segment = createSegment()
    const marks = markWaypoint(segment, "price-of")

    expect(waypointIds(build(segment, marks))).toStrictEqual(["format", "subtotal"])
    expect(buildControls(segment, marks).reviewedToggle).toStrictEqual({ label: "Show reviewed (1)", isShown: false, isAvailable: true })

    const shown = build(segment, marks, { filterKeys: [], isShowingReviewed: true })

    expect(waypointIds(shown)).toStrictEqual(["price-of", "format", "subtotal"])
    expect(shown.files[0].rows.find((row) => row.kind === "waypoint")).toMatchObject({ waypoint: { isReviewed: true } })
  })

  it("brings a reviewed waypoint back when its content changes", () => {
    const marks = markWaypoint(createSegment(), "price-of")
    const rewritten = createSegment({
      walkthrough: {
        intro: null,
        files: [{ path: PRICE_PATH, title: "Price file", summary: [], waypoints: [createWaypoint("price-of", "priceOf", { reading: "Rewritten." })] }],
      },
    })

    expect(waypointIds(build(rewritten, marks))).toStrictEqual(["price-of"])
  })

  it("treats a file as reviewed once every waypoint in it is, and hides it", () => {
    const segment = createSegment()
    const marks = markWaypoint(segment, "subtotal")
    const band = build(segment, marks)

    expect(band.files.map((file) => file.path)).toStrictEqual([PRICE_PATH])
    expect(build(segment, marks, { filterKeys: [], isShowingReviewed: true }).files[1]).toMatchObject({ isReviewed: true })
  })

  it("previews a finding's fix as the current lines removed and the replacement added", () => {
    const segment = createSegment({
      walkthrough: {
        intro: null,
        files: [
          {
            path: CART_PATH,
            title: "Cart file",
            summary: [],
            waypoints: [
              createWaypoint("subtotal", "subtotal", {
                findings: [createFinding("fix", "risk", { solution: "const fixed = 1" })],
              }),
            ],
          },
        ],
      },
    })
    const context = {
      ...createViewContext(),
      solutionTokens: new Map([["fix", [[{ text: "const fixed = 1", kind: "plain" as const }]]]]),
    }
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, context)
    const band = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), NO_DISCUSSION, context)
    const waypointRow = band.files[0].rows.find((row) => row.kind === "waypoint")
    const solution = waypointRow?.kind === "waypoint" ? waypointRow.waypoint.findings[0].solution : null

    expect(solution?.lines.map((line) => [line.numberLabel, line.mark])).toStrictEqual([
      ["1", "removed"],
      ["2", "removed"],
      ["", "added"],
    ])
  })
})
