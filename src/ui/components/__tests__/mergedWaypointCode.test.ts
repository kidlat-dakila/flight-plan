import { describe, expect, test } from "vitest"
import type { HighlightedCode } from "codehike/code"
import { mergedWaypointCode } from "../Scrollycoding"
import type { PreparedStep } from "../Scrollycoding"

/**
 * A step with only the code the merge reads.
 *
 * Members of a run share one window, so their annotations are all in the same
 * coordinate space; here each carries its own mark plus the diff they share.
 */
function step(annotations: { name: string; fromLineNumber?: number }[]): PreparedStep {
  return {
    code: {
      code: "line\nline\nline",
      lang: "ts",
      meta: "src/a.ts",
      tokens: [],
      themeName: "github-dark",
      annotations,
    },
  } as unknown as PreparedStep
}

function names(code: HighlightedCode): string[] {
  return code.annotations.map((annotation) => annotation.name)
}

function boxLines(code: HighlightedCode): number[] {
  return code.annotations
    .filter((annotation) => annotation.name === "waypoint")
    .map((annotation) =>
      "fromLineNumber" in annotation ? annotation.fromLineNumber : -1,
    )
}

function boxSteps(code: HighlightedCode): number[] {
  return code.annotations
    .filter((annotation) => annotation.name === "waypoint")
    .map((annotation) => (annotation.data as { stepIndex: number }).stepIndex)
}

describe("mergedWaypointCode", () => {
  test("one waypoint box per member, at the line it is about", () => {
    const merged = mergedWaypointCode(
      [
        step([{ name: "mark", fromLineNumber: 2 }]),
        step([{ name: "mark", fromLineNumber: 3 }]),
      ],
      [5, 6],
    )
    expect(boxLines(merged)).toEqual([2, 3])
    // Keyed by selection index, not by position in the run.
    expect(boxSteps(merged)).toEqual([5, 6])
  })

  test("every member's marks survive the merge", () => {
    const merged = mergedWaypointCode(
      [
        step([{ name: "mark", fromLineNumber: 2 }]),
        step([{ name: "mark", fromLineNumber: 3 }]),
      ],
      [0, 1],
    )
    const marks = merged.annotations.filter((annotation) => annotation.name === "mark")
    expect(marks).toHaveLength(2)
  })

  test("the diff is taken once, from the first member, and focus is dropped", () => {
    const merged = mergedWaypointCode(
      [
        step([
          { name: "diff", fromLineNumber: 1 },
          { name: "focus", fromLineNumber: 1 },
          { name: "mark", fromLineNumber: 2 },
        ]),
        step([
          { name: "diff", fromLineNumber: 1 },
          { name: "focus", fromLineNumber: 1 },
          { name: "mark", fromLineNumber: 3 },
        ]),
      ],
      [0, 1],
    )
    expect(names(merged).filter((name) => name === "diff")).toHaveLength(1)
    expect(names(merged)).not.toContain("focus")
  })

  test("a member with no marked line puts its box at the top", () => {
    const merged = mergedWaypointCode([step([])], [0])
    expect(boxLines(merged)).toEqual([1])
  })
})
