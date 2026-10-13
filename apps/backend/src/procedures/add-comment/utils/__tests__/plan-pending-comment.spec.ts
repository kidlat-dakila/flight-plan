import { isInChange, planPendingComment } from "@/procedures/add-comment/utils/plan-pending-comment"
import { parseMarkedSource } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"

const PATH = "src/price.ts"
const NOW = new Date("2026-10-01T12:00:00.000Z")

const MARKED = [
  " line one",
  " line two",
  " line three",
  " line four",
  " line five",
  "-removed six",
  "-removed seven",
  "+added six",
  " line seven",
].join("\n")

const artifact: ReviewArtifact = {
  title: "Price",
  status: "complete",
  commit: "abc1234",
  isSegmented: false,
  segments: [],
  sources: [parseMarkedSource(PATH, "typescript", MARKED)],
  changedPaths: [PATH],
}

const lineAt = (side: "old" | "new", startLine: number, endLine = startLine) => ({ path: PATH, side, startLine, endLine })

describe("isInChange", () => {
  it("takes the added lines, the removed lines by their old number, and the three lines around a change", () => {
    expect(isInChange(artifact, lineAt("new", 6))).toBe(true)
    expect(isInChange(artifact, lineAt("old", 6))).toBe(true)
    expect(isInChange(artifact, lineAt("old", 7))).toBe(true)
    expect(isInChange(artifact, lineAt("new", 3))).toBe(true)
    expect(isInChange(artifact, lineAt("new", 7))).toBe(true)
  })

  it("leaves out a line further from the change, an old line that was not removed, and a file it does not hold", () => {
    expect(isInChange(artifact, lineAt("new", 2))).toBe(false)
    expect(isInChange(artifact, lineAt("old", 3))).toBe(false)
    expect(isInChange(artifact, { ...lineAt("new", 6), path: "src/gone.ts" })).toBe(false)
  })

  it("needs both ends of a range to be in the change", () => {
    expect(isInChange(artifact, lineAt("new", 4, 6))).toBe(true)
    expect(isInChange(artifact, lineAt("new", 1, 6))).toBe(false)
  })
})

describe("planPendingComment", () => {
  it("plans a pending comment against the artifact's commit", () => {
    expect(planPendingComment(artifact, { id: "c1", position: lineAt("new", 6), body: "Why?", now: NOW })).toStrictEqual({
      kind: "planned",
      comment: { id: "c1", position: lineAt("new", 6), body: "Why?", createdAt: NOW, commit: "abc1234" },
    })
  })

  it("rejects a range that ends before it starts", () => {
    expect(planPendingComment(artifact, { id: "c1", position: lineAt("new", 6, 4), body: "Why?", now: NOW })).toMatchObject({
      kind: "rejected",
    })
  })
})
