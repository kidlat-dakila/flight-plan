import {
  CART_PATH,
  cartSource,
  createCodeBlock,
  createFinding,
  createSegment,
  createViewContext,
  createWaypoint,
  highlightPlainly,
  PRICE_PATH,
  priceSource,
} from "@/__tests__/review-fixture"
import {
  buildWalkthrough,
  buildWalkthroughControls,
  prepareWalkthrough,
  steppingOf,
  type PinnedLineFinder,
  type WalkthroughRequest,
} from "@/walkthrough/build"
import { reviewableSegmentFilesOf } from "@/walkthrough/reviewable-file"
import { flattenWaypoints } from "@/walkthrough/waypoints"
import type { Segment, FileRow, WalkthroughBand, WalkthroughControls } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@flightplan/reviewed-marks"

const EVERYTHING: WalkthroughRequest = { filterKeys: [], isShowingReviewed: false }
const findNoPinnedLines: PinnedLineFinder = () => []

const pinLines = (pinnedPath: string, lines: readonly number[]): PinnedLineFinder =>
  (path) => (path === pinnedPath ? lines : [])

const build = (segment: Segment, marks: ReviewedMarks = NO_REVIEWED_MARKS, request = EVERYTHING): WalkthroughBand => {
  const prepared = prepareWalkthrough(segment, marks, request, createViewContext())
  return buildWalkthrough(prepared, "", request, steppingOf([prepared]), findNoPinnedLines, createViewContext())
}

const buildControls = (segment: Segment, marks: ReviewedMarks = NO_REVIEWED_MARKS, request = EVERYTHING): WalkthroughControls => {
  const prepared = prepareWalkthrough(segment, marks, request, createViewContext())
  return buildWalkthroughControls(prepared, request, [])
}

const rowKinds = (rows: readonly FileRow[]): string[] => rows.map((row) => row.kind)

const shownTexts = (rows: readonly FileRow[]): string[] =>
  rows.flatMap((row) => (row.kind === "lines" ? row.lines.map((line) => line.tokens.map((token) => token.text).join("")) : []))

const waypointIds = (band: WalkthroughBand): string[] =>
  band.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint.id] : [])))

const markWaypoint = (segment: Segment, waypointId: string): ReviewedMarks => {
  const flat = segment.walkthrough.files
    .flatMap((file) => flattenWaypoints(file, file.path === PRICE_PATH ? priceSource : cartSource))
    .find((candidate) => candidate.waypoint.id === waypointId)
  return { ...NO_REVIEWED_MARKS, waypoints: flat === undefined ? {} : { [waypointId]: flat.fingerprint } }
}

describe("buildWalkthrough", () => {
  it("numbers the waypoints within their own segment, and prefixes a segment's anchors with its scope", () => {
    const context = createViewContext()
    const first = prepareWalkthrough(createSegment({ id: "one" }), NO_REVIEWED_MARKS, EVERYTHING, context)
    const second = prepareWalkthrough(
      createSegment({
        id: "two",
        walkthrough: { files: [{ path: CART_PATH, waypoints: [createWaypoint("late", "subtotal")] }] },
      }),
      NO_REVIEWED_MARKS,
      EVERYTHING,
      context,
    )
    const band = buildWalkthrough(second, "two-", EVERYTHING, steppingOf([first, second]), findNoPinnedLines, context)

    expect(band).toMatchObject({ anchorId: "two-code-walkthrough", files: [{ anchorId: "two-file-1" }] })
    expect(waypointIds(band)).toStrictEqual(["late"])
    expect(band.files[0].rows.find((row) => row.kind === "waypoint")).toMatchObject({
      waypoint: { positionLabel: "1 of 1", previousId: null, nextId: null },
    })
  })

  it("keeps a pinned line out of a gap", () => {
    const prepared = prepareWalkthrough(createSegment(), NO_REVIEWED_MARKS, EVERYTHING, createViewContext())
    const [priceFile] = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), pinLines(PRICE_PATH, [2]), createViewContext()).files

    expect(rowKinds(priceFile.rows).slice(0, 3)).toStrictEqual(["lines", "gap", "lines"])
  })

  it("draws each file once, with a waypoint box above the lines it is about", () => {
    const [priceFile] = build(createSegment()).files

    expect(priceFile.path).toBe(PRICE_PATH)
    expect(rowKinds(priceFile.rows)).toStrictEqual(["gap", "lines", "waypoint", "lines", "waypoint", "lines"])
  })

  it("shows a run of unchanged lines that is too short to be worth folding", () => {
    const segment = createSegment({
      walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("format", "format")] }] },
    })
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, createViewContext())
    const [priceFile] = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), pinLines(PRICE_PATH, [4]), createViewContext()).files

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
    expect(buildControls(createSegment()).stepping).toStrictEqual({
      previousLabel: "Previous waypoint",
      nextLabel: "Next waypoint",
    })
  })

  it("counts the filter and the reviewed waypoints over its own segment only", () => {
    const context = createViewContext()
    const first = prepareWalkthrough(createSegment({ id: "one" }), NO_REVIEWED_MARKS, EVERYTHING, context)
    const second = prepareWalkthrough(
      createSegment({
        id: "two",
        walkthrough: { files: [{ path: CART_PATH, waypoints: [createWaypoint("late", "subtotal", { coreChange: "Check the rounding." })] }] },
      }),
      NO_REVIEWED_MARKS,
      EVERYTHING,
      context,
    )
    const stepping = steppingOf([first, second])
    const coreChangeCountOf = (band: WalkthroughBand) => band.controls.filter.groups[0].options.find((option) => option.key === "core-change")?.detailLabel

    expect(coreChangeCountOf(buildWalkthrough(first, "one-", EVERYTHING, stepping, findNoPinnedLines, context))).toBe("0 waypoints")
    expect(coreChangeCountOf(buildWalkthrough(second, "two-", EVERYTHING, stepping, findNoPinnedLines, context))).toBe("1 waypoint")
  })

  it("places a nested waypoint one level deeper, after its parent", () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
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
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("found", "priceOf", {
                coreChange: "Slow down.",
                findings: [createFinding("nit", "nit"), createFinding("risk", "risk")],
              }),
              createWaypoint("unwritten", "format", { title: null, reading: "" }),
            ],
          },
        ],
      },
    })
    const [found, unwritten] = build(segment).files[0].rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))

    expect(found).toMatchObject({ chip: { kind: "risk", label: "Risk" }, coreChangeLabel: "Core change", isDraft: false })
    expect(unwritten).toMatchObject({ title: "format", isDraft: true, reading: null, chip: null })
  })

  it("gives a hint from the classification of its code blocks to each waypoint with no write-up, and none to a written one", () => {
    const changedBlock = createCodeBlock("price-of", PRICE_PATH, {
      classifications: ["component", "database-operation"],
      diffClassifications: ["database-operation"],
    })
    const unchangedBlock = createCodeBlock("format", PRICE_PATH, { name: "format", classifications: ["page"] })
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("changed", "priceOf", { reading: "", codeBlocks: [changedBlock] }),
              createWaypoint("unchanged", "format", { reading: "", codeBlocks: [unchangedBlock] }),
            ],
          },
          { path: CART_PATH, waypoints: [createWaypoint("written", "subtotal", { codeBlocks: [changedBlock] })] },
        ],
      },
    })
    const hints = build(segment).files.flatMap((file) =>
      file.rows.flatMap((row) => (row.kind === "waypoint" ? [[row.waypoint.id, row.waypoint.hint]] : [])))

    expect(hints).toStrictEqual([
      ["changed", "Changes a database read or write inside a component."],
      ["unchanged", "No lines changed in a page, but it uses code that did."],
      ["written", null],
    ])
  })

  it("marks a required waypoint with no reading as being written while an agent writes the review", () => {
    const segment = createSegment({
      walkthrough: {
        files: [{
          path: PRICE_PATH,
          waypoints: [
            createWaypoint("asked", "priceOf", { reading: "", isRequired: true }),
            createWaypoint("not-asked", "format", { reading: "" }),
          ],
        }],
      },
    })
    const writingOf = (isWriting: boolean): [string, boolean][] => {
      const context = { ...createViewContext(), isWriting }
      const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, context)
      return buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), findNoPinnedLines, context).files
        .flatMap((file) => file.rows.flatMap((row): [string, boolean][] => (row.kind === "waypoint" ? [[row.waypoint.id, row.waypoint.isBeingWritten]] : [])))
    }

    expect(writingOf(true)).toStrictEqual([["asked", true], ["not-asked", false]])
    expect(writingOf(false)).toStrictEqual([["asked", false], ["not-asked", false]])
  })

  it("gives no hint to a waypoint with no code block, in a file the codegraph does not trace", () => {
    const segment = createSegment({
      walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("untraced", "priceOf", { reading: "" })] }] },
    })
    const [waypoint] = build(segment).files[0].rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))

    expect(waypoint.hint).toBeNull()
  })

  it("shows the files in the order it is asked for, and lists them for arranging in their stored order", () => {
    const cartUsingPrice = { ...cartSource, references: [{ line: 2, startColumn: 1, endColumn: 8, path: PRICE_PATH, lines: [11, 13] as [number, number], isLibrary: false }] }
    const context = { ...createViewContext(), sources: [highlightPlainly(priceSource), highlightPlainly(cartUsingPrice)], walkthroughOrder: "imports-top-down" as const }
    const prepared = prepareWalkthrough(createSegment(), NO_REVIEWED_MARKS, EVERYTHING, context)
    const band = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), findNoPinnedLines, context)

    expect(band.files.map((file) => file.path)).toStrictEqual([CART_PATH, PRICE_PATH])
    expect(waypointIds(band)).toStrictEqual(["subtotal", "price-of", "format"])
    expect(band.fileOrder.map((file) => file.path)).toStrictEqual([PRICE_PATH, CART_PATH])
  })

  it("marks each waypoint by its most urgent finding, puts Core change before questions and nits, and counts a file's findings", () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("risky", "priceOf", { findings: [createFinding("nit", "nit"), createFinding("risk", "risk")] }),
              createWaypoint("attended", "format", { coreChange: "Slow down.", findings: [createFinding("question", "question")] }),
            ],
          },
          { path: CART_PATH, waypoints: [createWaypoint("plain", "subtotal")] },
        ],
      },
    })
    const band = build(segment)
    const waypoints = band.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

    expect(waypoints.map((waypoint) => [waypoint.mark, waypoint.rangeLabel])).toStrictEqual([
      [{ kind: "risk", kindLabel: "Risk", label: "Risk waypoint 1 of 3: Waypoint risky" }, "Lines 11–12"],
      [{ kind: "core-change", kindLabel: "Core change", label: "Core change waypoint 2 of 3: Waypoint attended" }, "Line 14"],
      [{ kind: "plain", kindLabel: "", label: "Waypoint 3 of 3: Waypoint plain" }, "Lines 1–2"],
    ])
    expect(band.files.map((file) => file.countLabels)).toStrictEqual([
      ["2 waypoints", "1 risk", "1 core change", "1 question", "1 nit"],
      ["1 waypoint"],
    ])
  })

  it("shows only the root block of a waypoint the filter keeps, folds the rest of the file, and drops a file with no box left", () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("buggy", "priceOf", { findings: [createFinding("bug", "bug")] }),
              createWaypoint("clean", "format"),
            ],
          },
          { path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] },
        ],
      },
    })
    const request: WalkthroughRequest = { filterKeys: ["bug"], isShowingReviewed: false }
    const band = build(segment, NO_REVIEWED_MARKS, request)

    expect(band.files.map((file) => file.path)).toStrictEqual([PRICE_PATH])
    expect(waypointIds(band)).toStrictEqual(["buggy"])
    expect(rowKinds(band.files[0].rows)).toStrictEqual(["gap", "waypoint", "lines", "gap"])
    expect(shownTexts(band.files[0].rows)).not.toContain("export const format = (price: number) => String(price / CENTS)")
    expect(band.files[0].rows.flatMap((row) => (row.kind === "gap" ? [row.label] : []))).toStrictEqual(["10 unchanged lines", "2 unchanged lines"])
    expect(band.files[0].rows.find((row) => row.kind === "waypoint")).toMatchObject({
      waypoint: { positionLabel: "1 of 1", previousId: null, nextId: null },
    })
  })

  it("shows a short run of blank lines between two root blocks the filter keeps", () => {
    const segment = createSegment({
      walkthrough: {
        files: [{
          path: PRICE_PATH,
          waypoints: [
            createWaypoint("one", "priceOf", { findings: [createFinding("nit-one", "nit")] }),
            createWaypoint("two", "format", { findings: [createFinding("nit-two", "nit")] }),
          ],
        }],
      },
    })
    const band = build(segment, NO_REVIEWED_MARKS, { filterKeys: ["nit"], isShowingReviewed: false })

    expect(rowKinds(band.files[0].rows)).toStrictEqual(["gap", "waypoint", "lines", "waypoint", "lines"])
  })

  it("says a gap holds lines the filter hides when changed lines are folded into it", () => {
    const segment = createSegment({
      walkthrough: {
        files: [{
          path: PRICE_PATH,
          waypoints: [createWaypoint("changed", "priceOf"), createWaypoint("flagged", "format", { findings: [createFinding("nit", "nit")] })],
        }],
      },
    })
    const band = build(segment, NO_REVIEWED_MARKS, { filterKeys: ["nit"], isShowingReviewed: false })

    expect(band.files[0].rows.flatMap((row) => (row.kind === "gap" ? [row.label] : []))).toStrictEqual(["14 lines hidden by the filter"])
  })

  it("shows the whole root block around a waypoint the filter keeps, and a line with a thread outside it", () => {
    const rootAround = createCodeBlock("prices", PRICE_PATH, { lineOfCodeRangeReference: [{ start: { line: 11, column: 1 }, end: { line: 14, column: 1 } }] })
    const inside = createCodeBlock("held", PRICE_PATH, { type: "condition", parentBlock: rootAround, isRoot: false })
    const segment = createSegment({
      walkthrough: {
        files: [{
          path: PRICE_PATH,
          waypoints: [createWaypoint("buggy", "priceOf", { codeBlocks: [inside], findings: [createFinding("bug", "bug")] }), createWaypoint("clean", "format")],
        }],
      },
    })
    const request: WalkthroughRequest = { filterKeys: ["bug"], isShowingReviewed: false }
    const context = createViewContext()
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, request, context)
    const [priceFile] = buildWalkthrough(prepared, "", request, steppingOf([prepared]), pinLines(PRICE_PATH, [1]), context).files

    expect(shownTexts(priceFile.rows)).toContain("export const format = (price: number) => String(price / CENTS)")
    expect(shownTexts(priceFile.rows)).toContain("import { rates } from \"./rates\"")
    expect(shownTexts(priceFile.rows)).not.toContain("const CENTS = 100")
  })

  it("says so when no waypoint matches the filter", () => {
    const band = build(createSegment(), NO_REVIEWED_MARKS, { filterKeys: ["bug"], isShowingReviewed: false })

    expect(band).toMatchObject({ files: [], emptyMessage: "No waypoint matches the filter." })
  })

  it("hides a reviewed waypoint, counts it, and shows it again on request", () => {
    const segment = createSegment()
    const marks = markWaypoint(segment, "price-of")

    expect(waypointIds(build(segment, marks))).toStrictEqual(["format", "subtotal"])
    expect(buildControls(segment, marks).reviewedToggle).toStrictEqual({ label: "Reviewed", countLabel: "1 waypoint", isShown: false, isAvailable: true })

    const shown = build(segment, marks, { filterKeys: [], isShowingReviewed: true })

    expect(waypointIds(shown)).toStrictEqual(["price-of", "format", "subtotal"])
    expect(shown.files[0].rows.find((row) => row.kind === "waypoint")).toMatchObject({ waypoint: { isReviewed: true } })
  })

  it("brings a reviewed waypoint back when its content changes", () => {
    const marks = markWaypoint(createSegment(), "price-of")
    const rewritten = createSegment({
      walkthrough: {
        files: [{ path: PRICE_PATH, waypoints: [createWaypoint("price-of", "priceOf", { reading: "Rewritten." })] }],
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
        files: [
          {
            path: CART_PATH,
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
    const band = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), findNoPinnedLines, context)
    const waypointRow = band.files[0].rows.find((row) => row.kind === "waypoint")
    const solution = waypointRow?.kind === "waypoint" ? waypointRow.waypoint.findings[0].solution : null

    expect(solution?.lines.map((line) => [line.numberLabel, line.mark])).toStrictEqual([
      ["1", "removed"],
      ["2", "removed"],
      ["", "added"],
    ])
  })
})

const spanning = (lineStart: number, lineEnd: number) => [{ start: { line: lineStart, column: 1 }, end: { line: lineEnd, column: 1 } }]

const PRICE_OF_ID = `${PRICE_PATH}#function:priceOf`
const FORMAT_ID = `${PRICE_PATH}#function:format`

const rootBlockSegment = (): Segment =>
  createSegment({
    walkthrough: {
      files: [
        {
          path: PRICE_PATH,
          waypoints: [
            createWaypoint("price-of", "priceOf", {
              codeBlocks: [
                createCodeBlock(`${PRICE_PATH}#function@11:1`, PRICE_PATH, {
                  lineOfCodeRangeReference: spanning(11, 12),
                  classifications: ["database-operation", "validation"],
                }),
              ],
            }),
            createWaypoint("format", "format", {
              codeBlocks: [createCodeBlock(`${PRICE_PATH}#function@14:1`, PRICE_PATH, { name: "format", lineOfCodeRangeReference: spanning(14, 14) })],
            }),
          ],
        },
      ],
    },
  })

const rootBlockMarks = (segment: Segment, rootBlockId: string): ReviewedMarks => {
  const [file] = reviewableSegmentFilesOf(segment, [priceSource, cartSource])
  const fingerprint = file.rootBlocks.find((rootBlock) => rootBlock.id === rootBlockId)?.fingerprint ?? ""
  return { ...NO_REVIEWED_MARKS, rootBlocks: { [rootBlockId]: fingerprint } }
}

describe("root blocks of a walkthrough file", () => {
  it("names each root block by its file, type and name, classifies it by the hierarchy, and says how to fold and mark it", () => {
    const [priceFile] = build(rootBlockSegment()).files

    expect(priceFile.rootBlocks).toStrictEqual([
      {
        id: PRICE_OF_ID,
        classification: { key: "database-operation", label: "Database operation" },
        spotlight: null,
        coreChangeLabel: null,
        isReviewed: false,
        reviewLabel: "Reviewed",
        reviewName: "Reviewed: Function priceOf",
        expandLabel: "Expand Function priceOf",
        collapseLabel: "Collapse Function priceOf",
      },
      {
        id: FORMAT_ID,
        classification: { key: "logic", label: "Logic" },
        spotlight: null,
        coreChangeLabel: null,
        isReviewed: false,
        reviewLabel: "Reviewed",
        reviewName: "Reviewed: Function format",
        expandLabel: "Expand Function format",
        collapseLabel: "Collapse Function format",
      },
    ])
  })

  it("puts a waypoint and a root block in the spotlight when what changed in them is a classification the user chose", () => {
    const changedBlock = createCodeBlock(`${PRICE_PATH}#function@11:1`, PRICE_PATH, {
      lineOfCodeRangeReference: spanning(11, 12),
      classifications: ["database-operation", "validation"],
      diffClassifications: ["validation"],
    })
    const segment = createSegment({
      walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("price-of", "priceOf", { codeBlocks: [changedBlock] })] }] },
    })
    const context = { ...createViewContext(), spotlight: ["validation", "auth"] as const }
    const prepared = prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, context)
    const [priceFile] = buildWalkthrough(prepared, "", EVERYTHING, steppingOf([prepared]), findNoPinnedLines, context).files
    const spotlight = { label: "Spotlight", classifications: [{ key: "validation", label: "Validation" }] }

    expect(priceFile.rootBlocks.map((rootBlock) => rootBlock.spotlight)).toStrictEqual([spotlight])
    expect(priceFile.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint.spotlight] : []))).toStrictEqual([spotlight])
  })

  it("marks a root block that holds a core change", () => {
    const segment = rootBlockSegment()
    const [file] = segment.walkthrough.files
    const marked = createSegment({
      walkthrough: { files: [{ ...file, waypoints: file.waypoints.map((waypoint) => (waypoint.id === "price-of" ? { ...waypoint, coreChange: "" } : waypoint)) }] },
    })

    expect(build(marked).files[0].rootBlocks.map((rootBlock) => [rootBlock.id, rootBlock.coreChangeLabel])).toStrictEqual([
      [PRICE_OF_ID, "Core change"],
      [FORMAT_ID, null],
    ])
  })

  it("folds a root block from its first line that is not removed, with the removed lines above it folded too", () => {
    const [priceFile] = build(rootBlockSegment()).files
    const collapses = priceFile.rows.flatMap((row) => (row.kind === "lines" ? row.collapses : []))

    expect(collapses).toStrictEqual([
      { rootBlockId: PRICE_OF_ID, fromLine: 1, toLine: 1, hasTrigger: false },
      { rootBlockId: PRICE_OF_ID, fromLine: 2, toLine: 3, hasTrigger: true },
      { rootBlockId: FORMAT_ID, fromLine: 1, toLine: 1, hasTrigger: true },
    ])
  })

  it("reviews a root block marked reviewed and hides the waypoints that sit in it", () => {
    const segment = rootBlockSegment()
    const [priceFile] = build(segment, rootBlockMarks(segment, PRICE_OF_ID)).files

    expect(priceFile.rootBlocks.map((rootBlock) => [rootBlock.id, rootBlock.isReviewed])).toStrictEqual([[PRICE_OF_ID, true], [FORMAT_ID, false]])
    expect(waypointIds(build(segment, rootBlockMarks(segment, PRICE_OF_ID)))).toStrictEqual(["format"])
  })

  it("reviews a root block once every waypoint inside it is reviewed", () => {
    const segment = rootBlockSegment()
    const [priceFile] = build(segment, markWaypoint(segment, "format"), { filterKeys: [], isShowingReviewed: true }).files

    expect(priceFile.rootBlocks.map((rootBlock) => [rootBlock.id, rootBlock.isReviewed])).toStrictEqual([[PRICE_OF_ID, false], [FORMAT_ID, true]])
  })

  it("tells apart two root blocks of one name, and names a root block with no name by its block id", () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("first", "priceOf", { codeBlocks: [createCodeBlock("first-block", PRICE_PATH, { lineOfCodeRangeReference: spanning(3, 3) })] }),
              createWaypoint("second", "format", { codeBlocks: [createCodeBlock("second-block", PRICE_PATH, { lineOfCodeRangeReference: spanning(14, 14) })] }),
              createWaypoint("third", "format", {
                codeBlocks: [createCodeBlock(`${PRICE_PATH}#root-statement@5:1`, PRICE_PATH, { name: undefined, type: "root-statement", lineOfCodeRangeReference: spanning(5, 5) })],
              }),
            ],
          },
        ],
      },
    })

    expect(reviewableSegmentFilesOf(segment, [priceSource])[0].rootBlocks.map((rootBlock) => rootBlock.id)).toStrictEqual([
      PRICE_OF_ID,
      `${PRICE_PATH}#root-statement@5:1`,
      `${PRICE_OF_ID}~2`,
    ])
  })
})
