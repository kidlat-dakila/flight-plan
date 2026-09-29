import { describe, expect, it } from "vitest"
import { splice, highlightProposal } from "../highlight"

/**
 * The splice is the one piece of arithmetic in this project that decides where
 * code gets *written*, not merely where it is shown. An off-by-one in a reference
 * displays the wrong line; an off-by-one here tells someone to put a function
 * inside another one.
 */

const FILE = ["one", "two", "three", "four", "five"]
const BODY = ["NEW-A", "NEW-B"]

describe("splice", () => {
  it("should insert after the named line", () => {
    const result = splice(FILE, BODY, { kind: "after", line: 2 })
    expect(result.value.split("\n")).toEqual([
      "one",
      "two",
      "NEW-A",
      "NEW-B",
      "three",
      "four",
      "five",
    ])
    expect(result.proposed).toEqual([{ from: 3, to: 4 }])
    expect(result.removed).toEqual([])
  })

  it("should insert before the named line", () => {
    const result = splice(FILE, BODY, { kind: "before", line: 2 })
    expect(result.value.split("\n").slice(0, 4)).toEqual([
      "one",
      "NEW-A",
      "NEW-B",
      "two",
    ])
  })

  it("should keep the lines a replace supersedes", () => {
    // The point of the whole rendering: a plan is a diff, so the code being
    // given up stays visible instead of being quietly dropped.
    const result = splice(FILE, BODY, { kind: "replace", from: 2, to: 3 })
    expect(result.value.split("\n")).toEqual([
      "one",
      "two",
      "three",
      "NEW-A",
      "NEW-B",
      "four",
      "five",
    ])
    expect(result.removed).toEqual([{ from: 2, to: 3 }])
    expect(result.proposed).toEqual([{ from: 4, to: 5 }])
  })

  it("should give proposed lines no file number and leave the rest alone", () => {
    // The lines below an insertion keep the numbers they have on disk today.
    // Renumbering them would invent numbers no editor or permalink agrees with.
    const result = splice(FILE, BODY, { kind: "after", line: 2 })
    expect(result.numbers).toEqual([1, 2, null, null, 3, 4, 5])
  })

  it("should number a superseded line and not the line replacing it", () => {
    const result = splice(FILE, BODY, { kind: "replace", from: 2, to: 3 })
    expect(result.numbers).toEqual([1, 2, 3, null, null, 4, 5])
  })

  it("should number every line of a new file", () => {
    const result = splice([], BODY, { kind: "new" })
    expect(result.value).toBe("NEW-A\nNEW-B")
    expect(result.numbers).toEqual([1, 2])
  })

  it("should clamp a position past the end of the file", () => {
    const result = splice(FILE, BODY, { kind: "after", line: 900 })
    expect(result.value.split("\n").slice(-2)).toEqual(["NEW-A", "NEW-B"])
  })
})

describe("highlightProposal", () => {
  const text = `${FILE.join("\n")}\n`

  it("should mark the proposal as an addition and the file as itself", async () => {
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "after", line: 2 }, anchor: null },
      BODY.join("\n"),
      [],
      text,
      "ts",
      "github-dark",
    )
    expect(resolved.proposed).toBe(true)
    expect(resolved.numbers).toEqual([1, 2, null, null, 3, 4, 5])
    expect(resolved.code.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "diff",
          query: "+",
          fromLineNumber: 3,
          toLineNumber: 4,
        }),
      ]),
    )
  })

  it("should mark superseded lines as removals", async () => {
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "replace", from: 2, to: 3 }, anchor: null },
      BODY.join("\n"),
      [],
      text,
      "ts",
      "github-dark",
    )
    expect(resolved.code.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "diff",
          query: "-",
          fromLineNumber: 2,
          toLineNumber: 3,
        }),
      ]),
    )
  })

  it("should follow the anchor when the position has drifted", async () => {
    // A plan written when `three` was on line 3 still inserts next to `three`
    // after two lines are added above it.
    const moved = `zero\nhalf\n${FILE.join("\n")}\n`
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "after", line: 3 }, anchor: "three" },
      BODY.join("\n"),
      [],
      moved,
      "ts",
      "github-dark",
    )
    expect(resolved.anchor).toBe("repaired")
    expect(resolved.shifted).toBe(2)
    // `three` is line 5 in the moved file, so the proposal follows it there.
    expect(resolved.numbers?.slice(0, 7)).toEqual([1, 2, 3, 4, 5, null, null])
  })

  it("should report a lost anchor rather than splicing at the stale line", async () => {
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "after", line: 2 }, anchor: "not in the file" },
      BODY.join("\n"),
      [],
      text,
      "ts",
      "github-dark",
    )
    expect(resolved.anchor).toBe("lost")
  })

  it("should render a new file from the body alone", async () => {
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "new" }, anchor: null },
      BODY.join("\n"),
      [],
      null,
      "ts",
      "github-dark",
    )
    expect(resolved.code.code.trim().split("\n")).toEqual(BODY)
    expect(resolved.numbers).toEqual([1, 2])
  })

  it("should count a mark from the first proposed line", async () => {
    // File numbers cannot address lines that are not in the file, so a mark on
    // a proposal is relative to the proposed code.
    const resolved = await highlightProposal(
      { path: "a.ts", at: { kind: "after", line: 2 }, anchor: null },
      BODY.join("\n"),
      [{ from: 2, to: 2 }],
      text,
      "ts",
      "github-dark",
    )
    expect(resolved.code.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "mark",
          fromLineNumber: 4,
          toLineNumber: 4,
        }),
      ]),
    )
  })
})
