import { NO_REVIEWED_MARKS, parseReviewedMarks } from "@/marks"
import type { ReviewableFile } from "@/reviewable-file"
import { applyReviewedChange } from "@/reviewed-change"
import { reviewedStateOf } from "@/reviewed-state"

const ROOT = "src/price.ts#function:priceOf"
const OTHER_ROOT = "src/price.ts#function:taxOf"

const FILE: ReviewableFile = {
  path: "src/price.ts",
  fingerprint: "file-1",
  waypoints: [
    { id: "parent", fingerprint: "parent-1", depth: 0, rootBlockIds: [ROOT] },
    { id: "child", fingerprint: "child-1", depth: 1, rootBlockIds: [ROOT] },
    { id: "tax", fingerprint: "tax-1", depth: 0, rootBlockIds: [OTHER_ROOT] },
    { id: "loose", fingerprint: "loose-1", depth: 0, rootBlockIds: [] },
  ],
  rootBlocks: [
    { id: ROOT, fingerprint: "root-1" },
    { id: OTHER_ROOT, fingerprint: "other-1" },
  ],
}

const marked = (subject: Parameters<typeof applyReviewedChange>[2], marks = NO_REVIEWED_MARKS) =>
  applyReviewedChange([FILE], marks, subject, true) ?? NO_REVIEWED_MARKS

const unmarked = (subject: Parameters<typeof applyReviewedChange>[2], marks: ReturnType<typeof marked>) =>
  applyReviewedChange([FILE], marks, subject, false) ?? NO_REVIEWED_MARKS

const reviewedIdsOf = (marks: ReturnType<typeof marked>) => {
  const state = reviewedStateOf(FILE, marks)
  return { isFileReviewed: state.isFileReviewed, waypoints: [...state.waypointIds], rootBlocks: [...state.rootBlockIds] }
}

describe("reviewedStateOf", () => {
  it("reviews nothing without marks", () => {
    expect(reviewedIdsOf(NO_REVIEWED_MARKS)).toStrictEqual({ isFileReviewed: false, waypoints: [], rootBlocks: [] })
  })

  it("reviews a root block marked itself, and the waypoints that sit only in reviewed root blocks", () => {
    expect(reviewedIdsOf(marked({ kind: "root-block", id: ROOT }))).toStrictEqual({
      isFileReviewed: false,
      waypoints: ["parent", "child"],
      rootBlocks: [ROOT],
    })
  })

  it("reviews a root block once every waypoint inside it is reviewed", () => {
    expect(reviewedIdsOf(marked({ kind: "waypoint", id: "parent" })).rootBlocks).toStrictEqual([ROOT])
    expect(reviewedIdsOf(marked({ kind: "waypoint", id: "child" })).rootBlocks).toStrictEqual([])
  })

  it("reviews everything in a file marked reviewed, and a file whose every waypoint is reviewed", () => {
    expect(reviewedIdsOf(marked({ kind: "file", path: FILE.path }))).toStrictEqual({
      isFileReviewed: true,
      waypoints: ["parent", "child", "tax", "loose"],
      rootBlocks: [ROOT, OTHER_ROOT],
    })
    const everyRoot = marked({ kind: "root-block", id: OTHER_ROOT }, marked({ kind: "root-block", id: ROOT }))
    expect(reviewedIdsOf(marked({ kind: "waypoint", id: "loose" }, everyRoot)).isFileReviewed).toBe(true)
  })

  it("stops counting a mark once the content it was made on changes", () => {
    const changedRoot: ReviewableFile = { ...FILE, rootBlocks: [{ id: ROOT, fingerprint: "root-2" }, FILE.rootBlocks[1]] }

    expect(reviewedStateOf(changedRoot, marked({ kind: "root-block", id: ROOT })).rootBlockIds.size).toBe(0)
  })
})

describe("applyReviewedChange", () => {
  it("marks a waypoint with the waypoints nested in it", () => {
    expect(Object.keys(marked({ kind: "waypoint", id: "parent" }).waypoints)).toStrictEqual(["parent", "child"])
  })

  it("takes the mark off a waypoint, off its file and off the root blocks it sits in", () => {
    const everything = marked({ kind: "root-block", id: ROOT }, marked({ kind: "file", path: FILE.path }))

    expect(unmarked({ kind: "waypoint", id: "child" }, everything)).toStrictEqual({
      waypoints: { parent: "parent-1", tax: "tax-1", loose: "loose-1" },
      files: {},
      rootBlocks: {},
    })
  })

  it("takes the mark off a root block, off its file and off the waypoints inside it", () => {
    const everything = marked({ kind: "root-block", id: OTHER_ROOT }, marked({ kind: "root-block", id: ROOT }, marked({ kind: "file", path: FILE.path })))

    expect(unmarked({ kind: "root-block", id: ROOT }, everything)).toStrictEqual({
      waypoints: { tax: "tax-1", loose: "loose-1" },
      files: {},
      rootBlocks: { [OTHER_ROOT]: "other-1" },
    })
  })

  it("takes the mark off a file and off everything in it", () => {
    expect(unmarked({ kind: "file", path: FILE.path }, marked({ kind: "root-block", id: ROOT }, marked({ kind: "file", path: FILE.path })))).toStrictEqual(
      NO_REVIEWED_MARKS,
    )
  })

  it("reports nothing for a subject no file has", () => {
    expect(applyReviewedChange([FILE], NO_REVIEWED_MARKS, { kind: "root-block", id: "gone" }, true)).toBeNull()
    expect(applyReviewedChange([FILE], NO_REVIEWED_MARKS, { kind: "waypoint", id: "gone" }, true)).toBeNull()
    expect(applyReviewedChange([FILE], NO_REVIEWED_MARKS, { kind: "file", path: "src/gone.ts" }, true)).toBeNull()
  })
})

describe("parseReviewedMarks", () => {
  it("reads marks it can validate, and no marks from anything else", () => {
    const marks = marked({ kind: "root-block", id: ROOT })

    expect(parseReviewedMarks(JSON.parse(JSON.stringify(marks)))).toStrictEqual(marks)
    expect(parseReviewedMarks({ waypoints: {} })).toStrictEqual(NO_REVIEWED_MARKS)
    expect(parseReviewedMarks(null)).toStrictEqual(NO_REVIEWED_MARKS)
  })
})
