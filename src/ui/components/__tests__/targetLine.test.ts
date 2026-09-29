import { describe, expect, test } from "vitest"
import type { HighlightedCode } from "codehike/code"
import { targetLineNumber } from "../Scrollycoding"

/** Only the annotations matter here, so the rest is the minimum that types. */
function withAnnotations(
  annotations: {
    name: string
    fromLineNumber?: number
    toLineNumber?: number
    lineNumber?: number
  }[],
): HighlightedCode {
  return {
    code: "",
    lang: "ts",
    meta: "",
    tokens: [],
    themeName: "github-dark",
    annotations,
  } as unknown as HighlightedCode
}

describe("targetLineNumber", () => {
  test("a mark wins over the focus around it", () => {
    /*
     * The case nesting produces: a child waypoint shares its parent's range,
     * so both carry the same focus, and the mark is the only thing that says
     * which block this waypoint is about. While focus won, every child in a
     * breakdown scrolled to the parent's first line.
     */
    const line = targetLineNumber(
      withAnnotations([
        { name: "focus", fromLineNumber: 1 },
        { name: "mark", fromLineNumber: 7 },
      ]),
    )
    expect(line).toBe(7)
  })

  test("declaration order does not decide it", () => {
    // The same two, written the other way round in the fence.
    const line = targetLineNumber(
      withAnnotations([
        { name: "mark", fromLineNumber: 7 },
        { name: "focus", fromLineNumber: 1 },
      ]),
    )
    expect(line).toBe(7)
  })

  test("falls back to the focus when nothing is marked", () => {
    expect(targetLineNumber(withAnnotations([{ name: "focus", fromLineNumber: 4 }]))).toBe(4)
  })

  test("then to a diff, then to a callout", () => {
    expect(targetLineNumber(withAnnotations([{ name: "diff", fromLineNumber: 9 }]))).toBe(9)
    expect(targetLineNumber(withAnnotations([{ name: "callout", lineNumber: 12 }]))).toBe(12)
  })

  test("no annotations means no particular line", () => {
    expect(targetLineNumber(withAnnotations([]))).toBeNull()
  })

  test("a mark wider than the focus lands on the focus", () => {
    /*
     * What a new file produces: its one hunk is the whole file, so a waypoint
     * that covers it marks lines 1 to the end. That mark says nothing about
     * where inside the file the waypoint is, and taking its first line put
     * every waypoint of the file on line 1.
     */
    const line = targetLineNumber(
      withAnnotations([
        { name: "focus", fromLineNumber: 128, toLineNumber: 176 },
        { name: "mark", fromLineNumber: 1, toLineNumber: 183 },
      ]),
    )
    expect(line).toBe(128)
  })

  test("a mark that starts before the focus is clipped to it", () => {
    const line = targetLineNumber(
      withAnnotations([
        { name: "focus", fromLineNumber: 36, toLineNumber: 38 },
        { name: "mark", fromLineNumber: 35, toLineNumber: 39 },
      ]),
    )
    expect(line).toBe(36)
  })

  test("prefers a mark inside the focus over one outside it", () => {
    const line = targetLineNumber(
      withAnnotations([
        { name: "focus", fromLineNumber: 20, toLineNumber: 30 },
        { name: "mark", fromLineNumber: 5, toLineNumber: 6 },
        { name: "mark", fromLineNumber: 24, toLineNumber: 24 },
      ]),
    )
    expect(line).toBe(24)
  })

  test("takes the first of several marks", () => {
    const line = targetLineNumber(
      withAnnotations([
        { name: "mark", fromLineNumber: 5 },
        { name: "mark", fromLineNumber: 20 },
      ]),
    )
    expect(line).toBe(5)
  })
})
